import idb from 'idb';
/**
 * Common database helper functions.
 */
let dbPromise;

class DBHelper {
  /**
   * Open a IDB Database
   */
  static openDatabase() {
    return idb.open('restaurants', 1, (upgradeDb) => {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
        case 1:
          const reviewStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
          reviewStore.createIndex('restaurant_id', 'restaurant_id');
        case 2:
          upgradeDb.createObjectStore('syncFavorites', { keyPath: 'restaurant_id' });
        case 3:
          const offlineReviewStore = upgradeDb.createObjectStore('offlineReviews', {
            keyPath: 'id',
            autoIncrement: true,
          });
          offlineReviewStore.createIndex('restaurant_id', 'restaurant_id');
      }
    });
  }
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}`;
  }
  /**
   * Show cached restaurants stored in IDB
   */
  static async getStoredRestaurants() {
    dbPromise = DBHelper.openDatabase();
    const db = await dbPromise;
    //if we showing posts or very first time of the page loading.
    //we don't need to go to idb
    if (!db) return;

    const tx = db.transaction('restaurants');
    const store = tx.objectStore('restaurants');

    return store.getAll();
  }

  static async getStoredRestaurantById(id) {
    dbPromise = DBHelper.openDatabase();
    const db = await dbPromise;
    //if we showing posts or very first time of the page loading.
    //we don't need to go to idb
    if (!db) return;

    const tx = db.transaction('restaurants');
    const store = tx.objectStore('restaurants');

    return store.get(id);
  }

  static async getStoredRestaurantReviews(id) {
    dbPromise = DBHelper.openDatabase();
    const db = await dbPromise;
    //if we showing posts or very first time of the page loading.
    //we don't need to go to idb
    if (!db) return;

    const tx = db.transaction('reviews');
    const store = tx.objectStore('reviews');
    const index = store.index('restaurant_id');

    return index.getAll(id);
  }

  /**
   * Fetch all restaurants.
   */
  static async fetchRestaurants(callback) {
    // get stored data from indexed db
    let restaurants = await DBHelper.getStoredRestaurants();
    // if we have data to show then we pass it immediately.
    if (restaurants.length > 0) {
      callback(null, restaurants);
    }

    try {
      // fetch from the network
      const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
      if (response.status === 200) {
        // Got a success response from server!
        restaurants = await response.json();

        // store data from network on indexed db
        const db = await dbPromise;
        if (!db) return;
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');

        restaurants.forEach((restaurant) => store.put(restaurant));

        // limlit data stored in indexed db
        store
          .openCursor(null, 'prev')
          .then((cursor) => cursor.advance(30))
          .then(function deleteRest(cursor) {
            if (!cursor) return;
            cursor.delete();
            return cursor.continue().then(deleteRest);
          });
        // update webpagw with new data
        callback(null, restaurants);
      } else {
        callback('Could not fetch restaurants', null);
      }
    } catch (error) {
      callback(error, null);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static async fetchRestaurantById(id, callback) {
    let restaurant = await DBHelper.getStoredRestaurantById(Number(id));
    // if we have data to show then we pass it immediately.
    if (restaurant) {
      callback(null, restaurant);
    }
    try {
      const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}`);
      if (response.status === 200) {
        // Got a success response from server!
        const restaurant = await response.json();
        const db = await dbPromise;
        if (!db) return;
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');
        // update restaurant on indexed db
        store.put(restaurant);
        // update webpage with new data
        callback(null, restaurant);
      } else {
        callback('Restaurant does not exist', null);
      }
    } catch (error) {
      callback(error, null);
    }
  }
  /**
   * Fetch a restaurant reviews by its ID.
   */
  static async fetchRestaurantReviews(id, callback) {
    let reviews = await DBHelper.getStoredRestaurantReviews(Number(id));
    // if we have data to show then we pass it immediately.
    if (reviews) {
      callback(null, reviews);
    }
    try {
      const response = await fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`);
      if (response.status === 200) {
        // Got a success response from server!
        const reviews = await response.json();
        const db = await dbPromise;
        if (!db) return;
        const tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        reviews.forEach((review) => store.put(review));
        // update webpage with new data
        callback(null, reviews);
      } else {
        callback('Could not fetch reviews', null);
      }
    } catch (error) {
      callback(error, null);
    }
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter((r) => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter((r) => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter((r) => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter((r) => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph}`;
  }
  /**
   * Generate source set for image.
   */
  static imageSrcSetForRestaurant(imageUrl) {
    return `${imageUrl}-small.jpg 320w, ${imageUrl}-medium.jpg 480w, ${imageUrl}-large.jpg 800w`;
  }
  /**
   * Generate source sizes for image.
   */
  static imageSizesForRestaurant() {
    return '(max-width: 320px) 280px, (max-width: 480px) 440px, 800px';
  }
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP,
    });
    return marker;
  }
  /**
   * Lazy load images.
   */
  static lazyLoadImages() {
    let lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));

    if (
      'IntersectionObserver' in window &&
      'IntersectionObserverEntry' in window &&
      'intersectionRatio' in window.IntersectionObserverEntry.prototype
    ) {
      let lazyImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let lazyImage = entry.target;
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.srcset = lazyImage.dataset.srcset;
            lazyImage.classList.remove('lazy');
            lazyImageObserver.unobserve(lazyImage);
          }
        });
      });

      lazyImages.forEach((lazyImage) => {
        lazyImageObserver.observe(lazyImage);
      });
    }
  }
}

export default DBHelper;
