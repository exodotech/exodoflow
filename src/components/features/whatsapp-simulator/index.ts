// Simulador WhatsApp — estrutura idêntica ao webhook real da Meta API
// O simulador usa a mesma tabela whatsapp_messages com payload JSONB
// que será usada pelo webhook real, garantindo migração zero-cost
export { ConversationList } from './ConversationList'
export { MessageBubble } from './MessageBubble'
export { ChatWindow } from './ChatWindow'
