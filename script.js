// script.js

const API_BASE_URL = "http://localhost:8000";
console.log("Script loaded!");

function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

// Handle login form submit
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const msg = await res.text();
          document.getElementById("message").innerText = msg;
          return;
        }

        const data = await res.json();

        // Decode JWT payload to get role
        const [, payloadBase64] = data.token.split('.');
        const payload = JSON.parse(atob(payloadBase64)); // Typo here, should be payloadBase64
        const role = payload.role;

        // Save token + role
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", role);

        // Redirect based on role
        if (role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "index.html";
        }

      } catch (err) {
        console.error(err);
        document.getElementById("message").innerText = "Login failed";
      }
    });
  }

  // Admin specific logic
  if (window.location.pathname.includes("admin.html")) {
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    if (!token || role !== "admin") {
      alert("Access denied. Admins only.");
      window.location.href = "login.html";
    }

    // For file uploads, we remove the 'Content-Type': 'application/json'
    // from the default headers object and let the browser set it automatically
    // with the correct 'multipart/form-data' boundary.
    const defaultHeaders = {
      Authorization: `Bearer ${token}`,
    };

    let allItems = [];
    let selectedItem = null;

    async function fetchItems() {
      try {
        const res = await fetch(`${API_BASE_URL}/items`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        allItems = await res.json();
      } catch (error) {
        console.error("Failed to fetch items:", error);
        alert("Failed to load items.");
      }
    }

    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const categories = await res.json();
        const select = document.getElementById("itemCategory");
        if (select) {
          select.innerHTML = "";
          categories.forEach((cat) => {
            const opt = document.createElement("option");
            opt.value = cat._id;
            opt.innerText = cat.name;
            select.appendChild(opt);
          });
        }
        await fetchItems();
      } catch (error) {
        console.error("Failed to load categories:", error);
        alert("Failed to load categories.");
      }
    }

    window.filterItems = function () {
      const input = document.getElementById("searchItem").value.toLowerCase();
      const suggestions = document.getElementById("suggestions");
      if (!suggestions) return;
      suggestions.innerHTML = "";

      if (!input) return;

      const matched = allItems.filter(item => item.name.toLowerCase().includes(input));

      matched.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = `${item.name} (${item.category?.name || "No category"})`;
        div.onclick = () => selectItem(item);
        suggestions.appendChild(div);
      });
    }

    window.selectItem = function (item) {
      selectedItem = item;
      document.getElementById("selectedItemName").textContent = item.name;
      document.getElementById("selectedItemCategory").textContent = item.category?.name || "Uncategorized";
      document.getElementById("selectedItemPrice").textContent = item.current_price;
      document.getElementById("selectedItemBox").style.display = "block";
      document.getElementById("suggestions").innerHTML = "";
      document.getElementById("searchItem").value = item.name;
      document.getElementById("newPriceInput").value = "";
    }

    window.updateSelectedPrice = async function () {
      const priceInput = document.getElementById("newPriceInput");
      const price = priceInput ? parseFloat(priceInput.value) : NaN;

      if (!selectedItem || isNaN(price)) {
        alert("Select an item and enter a valid new price.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/items/${selectedItem._id}/price`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json", // Still JSON for price update
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price }),
        });

        if (res.ok) {
          alert("Price updated!");
          await fetchItems();
          document.getElementById("selectedItemBox").style.display = "none";
          document.getElementById("searchItem").value = "";
          priceInput.value = "";
          selectedItem = null;
        } else {
          const errMsg = await res.text();
          alert("Failed to update price: " + errMsg);
        }
      } catch (error) {
        console.error("Error updating price:", error);
        alert("An error occurred while updating price.");
      }
    }

    // Add category
    const categoryForm = document.getElementById("categoryForm");
    if (categoryForm) {
      categoryForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("categoryName").value.trim();
        if (!name) {
          alert("Category name cannot be empty.");
          return;
        }
        try {
          const res = await fetch(`${API_BASE_URL}/categories`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json", // This remains JSON
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name }),
          });
          if (res.ok) {
            const adminMessage = document.getElementById("adminMessage");
            if (adminMessage) adminMessage.innerText = "Category added successfully!";
            categoryForm.reset();
            loadCategories();
          } else {
            const msg = await res.text();
            alert(`Failed to add category: ${msg}`);
          }
        } catch (error) {
          console.error("Error adding category:", error);
          alert("An error occurred while adding category.");
        }
      });
    }

    // Add item (ONLY ONE INSTANCE)
    const itemForm = document.getElementById("itemForm");
    if (itemForm) {
      itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("itemName").value.trim();
        const description = document.getElementById("itemDescription").value.trim();
        const price = parseFloat(document.getElementById("itemPrice").value);
        const categoryId = document.getElementById("itemCategory").value;
        const itemImageFile = document.getElementById("itemImage").files[0]; // Get the selected file

        if (!name || !categoryId || isNaN(price)) {
          alert("Please fill out all required fields correctly.");
          return;
        }

        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('categoryId', categoryId);
        if (itemImageFile) { // Only append if a file is selected
          formData.append('image', itemImageFile);
        }

        console.log("Submitting item with FormData:", formData);

        try {
          const res = await fetch(`${API_BASE_URL}/items`, {
            method: "POST",
            // IMPORTANT: Do NOT set 'Content-Type' header when using FormData.
            // The browser sets it automatically with the correct boundary.
            headers: {
                Authorization: `Bearer ${token}`, // Still need Authorization header
            },
            body: formData, // Send FormData directly
          });

          if (res.ok) {
            const adminMessage = document.getElementById("adminMessage");
            if (adminMessage) adminMessage.innerText = "Item added successfully!";
            itemForm.reset();
            await fetchItems();
          } else {
            const msg = await res.text();
            alert(`Failed to add item: ${msg}`);
          }
        } catch (error) {
          console.error("Error adding item:", error);
          alert("An error occurred while adding item.");
        }
      });
    }

    // Init
    loadCategories();
  }
});