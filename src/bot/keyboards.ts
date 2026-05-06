import { InlineKeyboard } from 'grammy';

export function centerKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Expense', 'add_expense')
    .text('➕ Income', 'add_income')
    .row()
    .text('💳 Debts', 'debts')
    .text('🔁 Recurring', 'recurring')
    .row()
    .text('🔄 Refresh', 'center');
}

export function successfulAddKeyboard(type: 'expense' | 'income' | 'debt' | 'recurring', id: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Edit', `edit:${type}:${id}`)
    .text('Delete', `delete:${type}:${id}`)
    .row()
    .text(`Add another ${type}`, `add_${type}`)
    .text('Weekly Center', 'center');
}
