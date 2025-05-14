class Auth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('user')) || null;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    isLibrarian() {
        return this.isAuthenticated() && this.currentUser.is_librarian;
    }

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    clearUser() {
        this.currentUser = null;
        localStorage.removeItem('user');
    }
}

const auth = new Auth();