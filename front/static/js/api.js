const API_BASE_URL = "http://127.0.0.1:5000";

class ApiService {
  constructor() {
    this.token = localStorage.getItem("token");
  }

  async request(endpoint, method = "GET", body = null, requiresAuth = true) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (requiresAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Something went wrong");
    }

    return response.json();
  }

  async register(name, email, password, isLibrarian = false) {
    return this.request(
      "/register",
      "POST",
      {
        name,
        email,
        password,
        is_librarian: isLibrarian,
      },
      false
    );
  }

  async login(email, password) {
    const data = await this.request(
      "/login",
      "POST",
      { email, password },
      false
    );
    this.token = data.access_token;
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async getBooks() {
    return this.request("/books");
  }

  async getCategories() {
    return this.request("/categories");
  }

  async createBook(name, author, category) {
    return this.request("/books", "POST", { name, author, category });
  }

  async getBorrowRequests() {
    return this.request("/borrow-requests");
  }

  async approveBorrowRequest(requestId) {
    return this.request(`/borrow-requests/${requestId}/approve`, "POST");
  }

  async requestBorrow(bookId) {
    return this.request(`/books/${bookId}/request-borrow`, "POST");
  }

  async returnBook(bookId) {
    return this.request(`/books/${bookId}/return`, "POST");
  }

  async getBorrowHistory() {
    return this.request("/user/history");
  }

  async createReview(bookId, text, rating) {
    return this.request(`/books/${bookId}/reviews`, "POST", { text, rating });
  }

  async createBook(name, author, category) {
    return this.request("/books", "POST", { name, author, category });
  }

  async createCategory(name) {
    return this.request('/categories', 'POST', { name });
  }

  async getCategories() {
    return this.request('/categories');
  }

  async getBooksByCategory(categoryId) {
    return this.request(`/categories/${categoryId}/books`);
  }
}

const api = new ApiService();
