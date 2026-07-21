const WISHLIST_KEY = "wishlistItems";
const WISHLIST_UPDATED_EVENT = "wishlistUpdated";

const normalizeWishlistItem = (item = {}) => {
  return {
    id: item.id,
    image: item.image || "",
    name: item.name || "",
    description: item.description || "",
    category: item.category || "",
    price: item.price || 0,
    size: item.size || "",
    is_available: item.is_available ?? true,
    average_rating: item.average_rating || 0,
    review_count: item.review_count || 0,
  };
};

const isSameItemId = (firstId, secondId) => {
  return String(firstId) === String(secondId);
};

const notifyWishlistUpdated = () => {
  // This custom event lets navbar badges or wishlist pages refresh immediately
  // after the wishlist changes, even if they are not directly connected by props.
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
};

export const getWishlistItems = () => {
  try {
    const storedItems = JSON.parse(localStorage.getItem(WISHLIST_KEY));

    if (!Array.isArray(storedItems)) {
      return [];
    }

    return storedItems.map(normalizeWishlistItem);
  } catch (error) {
    return [];
  }
};

export const saveWishlistItems = (items = []) => {
  const normalizedItems = Array.isArray(items)
    ? items.map(normalizeWishlistItem)
    : [];

  localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalizedItems));
  notifyWishlistUpdated();
};

export const isItemInWishlist = (itemId) => {
  const wishlist = getWishlistItems();

  return wishlist.some((item) => isSameItemId(item.id, itemId));
};

export const toggleWishlistItem = (item) => {
  const wishlist = getWishlistItems();
  const itemExists = wishlist.some((wishlistItem) =>
    isSameItemId(wishlistItem.id, item.id)
  );

  if (itemExists) {
    const updatedWishlist = wishlist.filter(
      (wishlistItem) => !isSameItemId(wishlistItem.id, item.id)
    );

    saveWishlistItems(updatedWishlist);
    return false;
  }

  saveWishlistItems([...wishlist, normalizeWishlistItem(item)]);
  return true;
};

export const removeWishlistItem = (itemId) => {
  const wishlist = getWishlistItems();

  const updatedWishlist = wishlist.filter(
    (item) => !isSameItemId(item.id, itemId)
  );

  saveWishlistItems(updatedWishlist);
};

export const clearWishlist = () => {
  localStorage.removeItem(WISHLIST_KEY);
  notifyWishlistUpdated();
};