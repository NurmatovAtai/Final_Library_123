class App {
  constructor() {
    this.init();
  }

  async init() {
    if (auth.isAuthenticated()) {
      await this.loadHomePage();
    } else {
      await this.loadLoginPage();
    }
  }

  async loadLoginPage() {
    const response = await fetch("templates/login.html");
    const html = await response.text();
    document.getElementById("profile").innerHTML = "";
    document.getElementById("app").innerHTML = html;

    this.setupLoginForm();
  }

  async loadRegisterPage() {
    const response = await fetch("templates/register.html");
    const html = await response.text();
    document.getElementById("profile").innerHTML = "";
    document.getElementById("app").innerHTML = html;

    this.setupRegisterForm();
  }

  async loadHomePage() {
    document.getElementById("profile").innerHTML = `
            <h1>Welcome, ${auth.currentUser.name}!</h1>
            <p>Email: ${auth.currentUser.email}</p>
            <p>Role: ${
              auth.currentUser.is_librarian ? "Librarian" : "Regular User"
            }</p>
            <button id="logout-btn">Logout</button>
            ${
              !auth.isLibrarian()
                ? '<button id="history-btn">My Borrow History</button>'
                : ""
            }
            ${
              auth.isLibrarian()
                ? '<button id="create-book-btn">Create New Book</button>'
                : ""
            }
            ${
              auth.isLibrarian()
                ? '<button id="create-category-btn">Create New Category</button>'
                : ""
            }
        `;

    document.getElementById("logout-btn").addEventListener("click", () => {
      api.logout();
      auth.clearUser();
      this.loadLoginPage();
    });

    if (document.getElementById("history-btn")) {
      document.getElementById("history-btn").addEventListener("click", () => {
        this.loadHistoryPage();
      });
    }

    if (document.getElementById("create-book-btn")) {
      document
        .getElementById("create-book-btn")
        .addEventListener("click", () => {
          this.showCreateBookForm();
        });
    }

    if (document.getElementById("create-category-btn")) {
      document
        .getElementById("create-category-btn")
        .addEventListener("click", () => {
          this.showCreateCategoryForm();
        });
    }

    if (auth.isLibrarian()) {
      await this.loadRequestsPage();
    } else {
      await this.loadBooksPage();
    }
  }

  showCreateCategoryForm() {
    const formHtml = `
        <div class="modal-overlay">
            <div class="create-category-form">
                <h2>Create New Category</h2>
                <form id="category-creation-form">
                    <div class="form-group">
                        <label for="category-name">Category Name:</label>
                        <input type="text" id="category-name" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Create Category</button>
                        <button type="button" id="cancel-category-create" class="btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", formHtml);

    document
      .getElementById("category-creation-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("category-name").value;

        if (!name.trim()) {
          alert("Please enter a category name");
          return;
        }

        try {
          await api.createCategory(name);
          alert("Category created successfully!");
          this.closeCreateCategoryForm();
        } catch (error) {
          alert(error.message);
        }
      });

    document
      .getElementById("cancel-category-create")
      .addEventListener("click", () => {
        this.closeCreateCategoryForm();
      });
  }

  closeCreateCategoryForm() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
      modal.remove();
    }
  }

  async loadHistoryPage() {
    try {
      const history = await api.getBorrowHistory();
      const html = `
                <div class="history-container">
                    <h2>My Borrow History</h2>
                    <button id="back-to-books">Back to Books</button>
                    <div id="history-list">
                        ${history
                          .map(
                            (book) => `
                            <div class="history-item" data-id="${book.id}">
                                <h3>${book.name}</h3>
                                <p>Author: ${book.author}</p>
                                <p>Category: ${book.category}</p>
                                ${
                                  book.review
                                    ? `
                                    <div class="review">
                                        <p>Your Review: ${book.review.text}</p>
                                        <p>Rating: ${book.review.rating}/5</p>
                                    </div>
                                `
                                    : `
                                    <div class="add-review">
                                        <textarea id="review-text-${
                                          book.id
                                        }" placeholder="Your review"></textarea>
                                        <select id="review-rating-${book.id}">
                                            ${[1, 2, 3, 4, 5]
                                              .map(
                                                (n) =>
                                                  `<option value="${n}">${n} Star${
                                                    n !== 1 ? "s" : ""
                                                  }</option>`
                                              )
                                              .join("")}
                                        </select>
                                        <button class="submit-review" data-id="${
                                          book.id
                                        }">Submit Review</button>
                                    </div>
                                `
                                }
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;

      document.getElementById("app").innerHTML = html;

      document.getElementById("back-to-books").addEventListener("click", () => {
        this.loadBooksPage();
      });

      document.querySelectorAll(".submit-review").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const bookId = e.target.dataset.id;
          const text = document.getElementById(`review-text-${bookId}`).value;
          const rating = document.getElementById(
            `review-rating-${bookId}`
          ).value;

          if (!text.trim()) {
            alert("Please enter your review text");
            return;
          }

          try {
            await api.createReview(bookId, text, parseInt(rating));
            alert("Review submitted successfully!");
            this.loadHistoryPage();
          } catch (error) {
            alert(error.message);
          }
        });
      });
    } catch (error) {
      alert("Failed to load history: " + error.message);
      this.loadBooksPage();
    }
  }

  showCreateBookForm() {
    const formHtml = `
            <div class="modal-overlay">
                <div class="create-book-form">
                    <h2>Create New Book</h2>
                    <form id="book-creation-form">
                        <div class="form-group">
                            <label for="book-name">Book Name:</label>
                            <input type="text" id="book-name" required>
                        </div>
                        <div class="form-group">
                            <label for="book-author">Author:</label>
                            <input type="text" id="book-author" required>
                        </div>
                        <div class="form-group">
                            <label for="book-category">Category:</label>
                            <input type="text" id="book-category" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Create Book</button>
                            <button type="button" id="cancel-create" class="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", formHtml);

    document
      .getElementById("book-creation-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("book-name").value;
        const author = document.getElementById("book-author").value;
        const category = document.getElementById("book-category").value;

        if (!name || !author || !category) {
          alert("Please fill in all fields");
          return;
        }

        try {
          await api.createBook(name, author, category);
          alert("Book created successfully!");
          this.closeCreateBookForm();
          if (auth.isLibrarian()) {
            await this.loadRequestsPage();
          }
        } catch (error) {
          alert(error.message);
        }
      });

    document.getElementById("cancel-create").addEventListener("click", () => {
      this.closeCreateBookForm();
    });
  }

  closeCreateBookForm() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
      modal.remove();
    }
  }

  async loadBooksPage() {
    const [booksResponse, categories] = await Promise.all([
      fetch("templates/books.html"),
      api.getCategories(),
    ]);

    const booksHtml = await booksResponse.text();
    document.getElementById("app").innerHTML = booksHtml;

    // Add category filter dropdown
    const filterContainer = document.createElement("div");
    filterContainer.className = "category-filter";
    filterContainer.innerHTML = `
        <select id="category-filter">
            <option value="">All Categories</option>
            ${categories
              .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
              .join("")}
        </select>
        <button id="apply-filter">Apply Filter</button>
    `;
    document.getElementById("app").prepend(filterContainer);

    const books = await api.getBooks();
    this.renderBooks(books);

    // Setup filter event
    document
      .getElementById("apply-filter")
      .addEventListener("click", async () => {
        const categoryId = document.getElementById("category-filter").value;
        const books = categoryId
          ? await api.getBooksByCategory(categoryId)
          : await api.getBooks();
        this.renderBooks(books);
      });

    this.setupBookEvents();
  }

  async loadRequestsPage() {
    const [requestsResponse, requests] = await Promise.all([
      fetch("templates/requests.html"),
      api.getBorrowRequests(),
    ]);

    const requestsHtml = await requestsResponse.text();
    document.getElementById("app").innerHTML = requestsHtml;

    this.renderRequests(requests);

    this.setupRequestEvents();
  }

  renderBooks(books) {
    const booksContainer = document.getElementById("books-container");
    if (!booksContainer) return;
    console.log(books);

    booksContainer.innerHTML = books
      .map(
        (book) => `
            <div class="book" data-id="${book.id}">
                <h3>${book.name}</h3>
                <p>Author: ${book.author}</p>
                <p>Category: ${book.category}</p>
                <p>Rating: ${book.rating.toFixed(1)}</p>
                <p>Status: ${book.available ? "Available" : "Borrowed"}</p>
                ${
                  book.available
                    ? `<button class="request-btn">Request Borrow</button>`
                    : `<button class="return-btn" ${
                        book.current_borrowers[0].id === auth.currentUser.id
                          ? ""
                          : "disabled"
                      }>Return</button>`
                }
                <div class="reviews">
                    ${book.reviews
                      .map(
                        (review) => `
                        <div class="review">
                            <p>${review.text}</p>
                            <p>Rating: ${review.rating}/5</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
      )
      .join("");
  }

  renderRequests(requests) {
    const requestsContainer = document.getElementById("requests-container");
    if (!requestsContainer) return;

    requestsContainer.innerHTML = requests
      .map(
        (request) => `
            <div class="request" data-id="${request.id}">
                <h3>Book: ${request.book_name}</h3>
                <p>Requested by: ${request.user_name}</p>
                <button class="approve-btn">Approve</button>
            </div>
        `
      )
      .join("");
  }

  setupBookEvents() {
    document.querySelectorAll(".request-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const bookId = e.target.closest(".book").dataset.id;
        try {
          await api.requestBorrow(bookId);
          alert("Borrow request submitted successfully!");
          this.loadBooksPage();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll(".return-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const bookId = e.target.closest(".book").dataset.id;
        try {
          await api.returnBook(bookId);
          alert("Book returned successfully!");
          this.loadBooksPage();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  setupRequestEvents() {
    document.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const requestId = e.target.closest(".request").dataset.id;
        try {
          await api.approveBorrowRequest(requestId);
          alert("Request approved successfully!");
          this.loadRequestsPage();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  setupLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await api.login(email, password);
        auth.setUser(response.user);
        await this.loadHomePage();
      } catch (error) {
        alert(error.message);
      }
    });

    const registerLink = document.getElementById("register-link");
    if (registerLink) {
      registerLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadRegisterPage();
      });
    }
  }

  setupRegisterForm() {
    const form = document.getElementById("register-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const isLibrarian = document.getElementById("is-librarian").checked;

      try {
        await api.register(name, email, password, isLibrarian);
        alert("Registration successful! Please login.");
        this.loadLoginPage();
      } catch (error) {
        alert(error.message);
      }
    });

    const loginLink = document.getElementById("login-link");
    if (loginLink) {
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadLoginPage();
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
