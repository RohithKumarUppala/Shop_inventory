const API_BASE_URL = "http://localhost:8000";
let allItems = [];

async function fetchCategories() {
  const res = await fetch(`${API_BASE_URL}/categories`);
  const categories = await res.json();
  const select = document.getElementById("categoryFilter");
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat._id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

async function fetchItems() {
  const res = await fetch(`${API_BASE_URL}/items`);
  allItems = await res.json();
  displayItems(allItems);
}

function displayItems(items) {
  const container = document.getElementById("itemList");
  container.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <img src="${item.image_url || 'https://via.placeholder.com/200'}" alt="${item.name}" />
      <h4>${item.name}</h4>
      <p><strong>Price:</strong> ₹${item.current_price}</p>
      <p><strong>Category:</strong> ${item.category?.name || "Uncategorized"}</p>
      <button onclick="togglePriceHistory('${item._id}')">Show Price History</button>
      <div id="history-${item._id}" class="price-history" style="display: none;"></div>
    `;
    container.appendChild(div);
  });
}

function userFilterItems() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const categoryId = document.getElementById("categoryFilter").value;

  const filtered = allItems.filter(item => {
    const matchesName = item.name.toLowerCase().includes(keyword);
    const matchesCategory = !categoryId || item.category?._id === categoryId;
    return matchesName && matchesCategory;
  });

  displayItems(filtered);
}

async function togglePriceHistory(itemId) {
  const div = document.getElementById(`history-${itemId}`);
  if (div.style.display === "none") {
    const item = allItems.find(i => i._id === itemId);
    if (!item || !item.price_history) return;

    div.innerHTML = item.price_history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(p => `<p>₹${p.price} on ${new Date(p.date).toLocaleDateString()}</p>`)
      .join("");
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
}

// Event listeners
document.getElementById("searchInput").addEventListener("input", userFilterItems);
document.getElementById("categoryFilter").addEventListener("change", userFilterItems);

// Initial load
fetchCategories();
fetchItems();
