/* HKDBF Inventory: static-site app. Changes are stored in this browser until exported. */
const KEYS = { inventory: "hkdbf-inventory-v1", changes: "hkdbf-changes-v1", locations: "hkdbf-locations-v1" };
let inventory = [], changes = [], years = [], locations = [], activeLocation = null, selectedYear = 2026;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[c]);
const today = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date());

async function loadData() {
  const [baseResponse, changesResponse] = await Promise.all([fetch("data/inventory.json"), fetch("data/test_changes.json")]);
  const base = await baseResponse.json();
  const changeData = await changesResponse.json();
  inventory = JSON.parse(localStorage.getItem(KEYS.inventory) || "null") || base.items;
  changes = JSON.parse(localStorage.getItem(KEYS.changes) || "null") || changeData.changes;
  years = changeData.years;
  if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
  years.sort();
  locations = JSON.parse(localStorage.getItem(KEYS.locations) || "null") || [...new Set(inventory.map((item) => item.location))].sort();
  selectedYear = years.includes(2026) ? 2026 : years[0];
  render();
}

function save() {
  localStorage.setItem(KEYS.inventory, JSON.stringify(inventory));
  localStorage.setItem(KEYS.changes, JSON.stringify(changes));
  localStorage.setItem(KEYS.locations, JSON.stringify(locations));
}
function totalFor(item) { return item.amount + changes.filter((change) => change.itemId === item.id).reduce((sum, change) => sum + change.delta, 0); }
function changeFor(item, year) { return changes.filter((change) => change.itemId === item.id && change.year === Number(year)).reduce((sum, change) => sum + change.delta, 0); }
function number(value) { return new Intl.NumberFormat("en-US").format(value); }
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2200); }

function render() {
  $("#today").textContent = today;
  $("#home-view").classList.toggle("hidden", Boolean(activeLocation));
  $("#location-view").classList.toggle("hidden", !activeLocation);
  if (activeLocation) renderLocation(); else renderHome();
  $("#locations").innerHTML = locations.map((location) => `<option value="${escapeHtml(location)}"></option>`).join("");
}

function renderHome() {
  const totalItems = inventory.reduce((sum, item) => sum + totalFor(item), 0);
  const annual = changes.filter((change) => change.year === selectedYear).reduce((sum, change) => sum + change.delta, 0);
  $("#stats").innerHTML = `
    <div class="stat"><strong>${number(totalItems)}</strong><span>tracked units</span></div>
    <div class="stat"><strong>${number(inventory.length)}</strong><span>inventory line items</span></div>
    <div class="stat"><strong>${annual > 0 ? "+" : ""}${number(annual)}</strong><span>${selectedYear} net change</span></div>`;
  $("#location-grid").innerHTML = locations.map((location) => {
    const items = inventory.filter((item) => item.location === location);
    const total = items.reduce((sum, item) => sum + totalFor(item), 0);
    return `<button class="location-card" data-location="${escapeHtml(location)}"><h2>${escapeHtml(location)}</h2><strong>${number(total)}</strong><p>${items.length} item type${items.length === 1 ? "" : "s"}</p></button>`;
  }).join("") || "<p>No locations yet. Add one from an inventory page.</p>";
  document.querySelectorAll("[data-location]").forEach((button) => button.addEventListener("click", () => { activeLocation = button.dataset.location; render(); }));
}

function renderLocation() {
  $("#location-title").textContent = activeLocation;
  $("#year-select").innerHTML = years.map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("");
  $("#year-header").textContent = `${selectedYear} change`;
  const items = inventory.filter((item) => item.location === activeLocation).sort((a, b) => a.name.localeCompare(b.name));
  $("#inventory-rows").innerHTML = items.map((item) => {
    const annualChange = changeFor(item, selectedYear);
    const changeClass = annualChange > 0 ? "positive" : annualChange < 0 ? "negative" : "";
    const note = item.notes ? `<span class="help" data-tip="${escapeHtml(item.notes)}" tabindex="0" aria-label="Item details">?</span>` : "";
    return `<tr>
      <td class="item-name">${escapeHtml(item.name)}${note}</td>
      <td class="amount">${number(item.amount)}</td>
      <td class="amount change ${changeClass}" data-change="${item.id}">${annualChange > 0 ? "+" : ""}${number(annualChange)}</td>
      <td class="amount current">${number(totalFor(item))}</td>
      <td><div class="adjuster"><button data-adjust="-1" data-id="${item.id}" aria-label="Subtract one from ${escapeHtml(item.name)}">−</button><input data-input="${item.id}" type="number" value="${annualChange}" aria-label="${selectedYear} adjustment for ${escapeHtml(item.name)}"><button data-adjust="1" data-id="${item.id}" aria-label="Add one to ${escapeHtml(item.name)}">+</button></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">No items are assigned to this location yet.</td></tr>`;
  document.querySelectorAll("[data-adjust]").forEach((button) => button.addEventListener("click", () => updateChange(button.dataset.id, Number(button.dataset.adjust))));
  document.querySelectorAll("[data-input]").forEach((input) => input.addEventListener("change", () => setAnnualChange(input.dataset.input, Number(input.value) || 0)));
}

function updateChange(itemId, delta) {
  changes.push({ id: `change-${crypto.randomUUID()}`, itemId, year: selectedYear, delta, date: new Date().toISOString().slice(0, 10), note: "Website adjustment" });
  save(); render();
}
function setAnnualChange(itemId, target) {
  const existing = changeFor({ id: itemId }, selectedYear);
  const delta = target - existing;
  if (delta) { changes.push({ id: `change-${crypto.randomUUID()}`, itemId, year: selectedYear, delta, date: new Date().toISOString().slice(0, 10), note: "Manual annual adjustment" }); save(); }
  render();
}

function openItemDialog() { const form = $("#item-form"); form.reset(); form.location.value = activeLocation || locations[0] || "Annex"; $("#item-dialog").showModal(); }
function addItem(event) {
  event.preventDefault(); const data = new FormData(event.currentTarget); const location = data.get("location").trim() || "Annex";
  inventory.push({ id: `item-${crypto.randomUUID()}`, name: data.get("name").trim(), amount: Number(data.get("amount")), location, notes: data.get("notes").trim() });
  if (!locations.includes(location)) locations.push(location);
  save(); $("#item-dialog").close(); activeLocation = location; render(); toast("Inventory item added");
}
function addLocation(event) {
  event.preventDefault(); const location = new FormData(event.currentTarget).get("location").trim();
  if (location && !locations.includes(location)) { locations.push(location); locations.sort(); save(); activeLocation = location; toast("Location added"); }
  $("#location-dialog").close(); render();
}
function downloadBackup() {
  const backup = { exportedAt: new Date().toISOString(), inventory, locations, changes, years };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `hkdbf-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); toast("Backup downloaded");
}

$("#home-button").addEventListener("click", () => { activeLocation = null; render(); });
$("#back-button").addEventListener("click", () => { activeLocation = null; render(); });
$("#year-select").addEventListener("change", (event) => { selectedYear = Number(event.target.value); renderLocation(); });
$("#add-item-button").addEventListener("click", openItemDialog); $("#add-item-here").addEventListener("click", openItemDialog);
$("#add-location").addEventListener("click", () => $("#location-dialog").showModal()); $("#item-form").addEventListener("submit", addItem); $("#location-form").addEventListener("submit", addLocation); $("#backup-button").addEventListener("click", downloadBackup);
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
loadData().catch((error) => { document.querySelector("main").innerHTML = `<p>Could not load inventory data. Run this site through a local web server (see README).<br><small>${escapeHtml(error.message)}</small></p>`; });
