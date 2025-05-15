from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Category, Book, Review, RequestedBorrow
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from flask_cors import CORS  # Add this import at the top

app = Flask(__name__, static_folder='front', static_url_path='')
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5000", "http://127.0.0.1:5000"], supports_credentials=True)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///library.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'secret-key' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all(k in data for k in ['name', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        name=data['name'],
        email=data['email'],
        is_librarian=data.get('is_librarian', False)
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_librarian': user.is_librarian
        }
    }), 200

@app.route('/user/history', methods=['GET'])
@jwt_required()
def get_user_history():
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    history_books = current_user.history_books
    
    user_reviews = {
        review.book_id: {'text': review.text, 'rating': review.rating}
        for review in current_user.given_ratings
    }
    
    return jsonify([{
        'id': book.id,
        'name': book.name,
        'author': book.author,
        'category': book.category.name,
        'review': user_reviews.get(book.id)
    } for book in history_books]), 200

@app.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    if not current_user.is_librarian:
        return jsonify({'error': 'Only librarians can create categories'}), 403
    
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Category name is required'}), 400
    
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Category already exists'}), 400
    
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    
    return jsonify({'message': 'Category created', 'id': category.id}), 201

@app.route('/categories', methods=['GET'])
def get_all_categories():
    categories = Category.query.all()
    return jsonify([
        {
            'id': category.id,
            'name': category.name,
            'books': [
                {
                    'id': book.id,
                    'name': book.name,
                    'author': book.author,
                    'rating': book.rating,
                    'available': len(book.current_borrowers) == 0
                } for book in category.books
            ]
        } for category in categories
    ]), 200

@app.route('/categories/<int:category_id>/books', methods=['GET'])
def get_books_by_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    books = Book.query.filter_by(category_id=category_id).all()
    
    books_data = []
    for book in books:
        book_data = {
            'id': book.id,
        'name': book.name,
        'author': book.author,
        'category': book.category.name,
        'rating': book.rating,
        'current_borrowers': [{
            'id': user.id,
            'name': user.name,
            'email': user.email
        } for user in book.current_borrowers],
        'available': len(book.current_borrowers) == 0,
        'reviews': [{'id': r.id, 'text': r.text, 'rating': r.rating} for r in book.reviews]
        }
        books_data.append(book_data)
    
    return jsonify(books_data), 200

@app.route('/books', methods=['GET'])
def get_all_books():
    books = Book.query.all()
    return jsonify([{
        'id': book.id,
        'name': book.name,
        'author': book.author,
        'category': book.category.name,
        'rating': book.rating,
        'current_borrowers': [{
            'id': user.id,
            'name': user.name,
            'email': user.email
        } for user in book.current_borrowers],
        'available': len(book.current_borrowers) == 0,
        'reviews': [{'id': r.id, 'text': r.text, 'rating': r.rating} for r in book.reviews]
    } for book in books]), 200

@app.route('/books', methods=['POST'])
@jwt_required()
def create_book():
    user_id = get_jwt_identity()
    print(user_id)
    
    current_user = User.query.get(user_id)
    print(current_user)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    if not current_user.is_librarian: 
        return jsonify({'error': 'Only librarians can create books'}), 403
    
    data = request.get_json()
    if not all(k in data for k in ['name', 'author', 'category']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    category = Category.query.filter_by(name=data['category']).first()
    if not category:
        category = Category(name=data['category'])
        db.session.add(category)
        db.session.commit()
    
    book = Book(
        name=data['name'],
        author=data['author'],
        category_id=category.id
    )
    db.session.add(book)
    db.session.commit()
    
    return jsonify({'message': 'Book created', 'id': book.id}), 201

@app.route('/books/<int:book_id>/request-borrow', methods=['POST'])
@jwt_required()
def request_borrow(book_id):
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    user = current_user
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if book.current_borrowers:
        return jsonify({'error': 'Book is already borrowed'}), 400
    
    existing_request = RequestedBorrow.query.filter_by(
        user_id=user.id,
        book_id=book.id,
        is_approved=False
    ).first()
    
    if existing_request:
        return jsonify({'error': 'You already have a pending request for this book'}), 400
    
    borrow_request = RequestedBorrow(
        user_id=user.id,
        book_id=book.id
    )
    db.session.add(borrow_request)
    db.session.commit()
    
    return jsonify({'message': 'Borrow request created', 'id': borrow_request.id}), 201

@app.route('/borrow-requests', methods=['GET'])
@jwt_required()
def get_borrow_requests():
    user_id = get_jwt_identity()  
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    if not current_user.is_librarian:
        return jsonify({'error': 'Only librarians can view borrow requests'}), 403
    
    requests = RequestedBorrow.query.filter_by(is_approved=False).all()
    return jsonify([{
        'id': r.id,
        'book_id': r.book.id,
        'book_name': r.book.name,
        'user_id': r.user.id,
        'user_name': r.user.name
    } for r in requests]), 200

@app.route('/borrow-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_borrow(request_id):
    user_id = get_jwt_identity() 
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    if not current_user.is_librarian:
        return jsonify({'error': 'Only librarians can approve requests'}), 403
    
    borrow_request = RequestedBorrow.query.get(request_id)
    if not borrow_request:
        return jsonify({'error': 'Request not found'}), 404
    
    if borrow_request.is_approved:
        return jsonify({'error': 'Request already approved'}), 400
    
    if borrow_request.book.current_borrowers:
        return jsonify({'error': 'Book is already borrowed'}), 400
    
    borrow_request.is_approved = True
    borrow_request.book.current_borrowers.append(borrow_request.user)
    db.session.commit()
    
    return jsonify({'message': 'Borrow request approved'}), 200

@app.route('/books/<int:book_id>/return', methods=['POST'])
@jwt_required()
def return_book(book_id):
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    user = current_user
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if user not in book.current_borrowers:
        return jsonify({'error': 'You have not borrowed this book'}), 400
    
    book.current_borrowers.remove(user)
    
    if user not in book.past_borrowers:
        book.past_borrowers.append(user)
    
    db.session.commit()
    
    return jsonify({'message': 'Book returned successfully'}), 200

@app.route('/books/<int:book_id>/reviews', methods=['POST'])
@jwt_required()
def create_review(book_id):
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if current_user not in book.past_borrowers:
        return jsonify({'error': 'You must have borrowed this book before to leave a review'}), 403
    
    data = request.get_json()
    if not all(k in data for k in ['text', 'rating']):
        return jsonify({'error': 'Missing required fields (text and rating)'}), 400
    
    try:
        rating = float(data['rating'])
        if rating < 0 or rating > 5:
            return jsonify({'error': 'Rating must be between 0 and 5'}), 400
    except ValueError:
        return jsonify({'error': 'Rating must be a number'}), 400
    
    existing_review = Review.query.filter_by(
        user_id=current_user.id,
        book_id=book.id
    ).first()
    
    if existing_review:
        return jsonify({'error': 'You have already reviewed this book'}), 400
    
    review = Review(
        text=data['text'],
        rating=rating,
        user_id=current_user.id,
        book_id=book.id
    )
    db.session.add(review)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Review created successfully',
        'review': {
            'id': review.id,
            'text': review.text,
            'rating': review.rating,
            'user_name': current_user.name
        }
    }), 201

if __name__ == '__main__':
    app.run(debug=True)