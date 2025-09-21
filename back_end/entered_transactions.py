from flask import Blueprint, request, jsonify
from .models import db, EnteredTransaction

entered_transactions_bp = Blueprint('entered_transactions', __name__)

@entered_transactions_bp.route('/entered_transactions', methods=['POST'])
def add_entered_transaction():
    data = request.json
    new_transaction = EnteredTransaction(
        user_id=data['user_id'],
        date=data['date'],
        amount=data['amount'],
        category_id=data['category_id']
    )
    db.session.add(new_transaction)
    db.session.commit()
    return jsonify(new_transaction.to_dict()), 201

@entered_transactions_bp.route('/entered_transactions', methods=['GET'])
def get_entered_transactions():
    user_id = request.args.get('user_id')
    transactions = EnteredTransaction.query.filter_by(user_id=user_id).all()
    return jsonify([transaction.to_dict() for transaction in transactions])

@entered_transactions_bp.route('/entered_transactions/<int:transaction_id>', methods=['PUT'])
def update_entered_transaction(transaction_id):
    transaction = EnteredTransaction.query.get_or_404(transaction_id)
    data = request.json
    transaction.date = data.get('date', transaction.date)
    transaction.amount = data.get('amount', transaction.amount)
    transaction.category_id = data.get('category_id', transaction.category_id)
    db.session.commit()
    return jsonify(transaction.to_dict())

@entered_transactions_bp.route('/entered_transactions/<int:transaction_id>', methods=['DELETE'])
def delete_entered_transaction(transaction_id):
    transaction = EnteredTransaction.query.get_or_404(transaction_id)
    db.session.delete(transaction)
    db.session.commit()
    return '', 204
