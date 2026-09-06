import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  ShoppingBag, 
  Utensils, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Upload, 
  ChevronRight, 
  MessageCircle, 
  Clock, 
  DollarSign, 
  User, 
  AlertCircle, 
  QrCode, 
  CheckCircle,
  Copy,
  ExternalLink,
  Smartphone,
  Search,
  Ticket,
  Receipt,
  Printer
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Interfaces for Cantina System
export interface CantinaProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  quantity_available: number;
  organizer_phone?: string;
  quantity_extra?: number;
  is_active: boolean;
  created_at?: string;
}

export interface CantinaVoucher {
  id: string;
  product_id: string;
  buyer_name: string;
  buyer_phone: string;
  quantity: number;
  total_price: number;
  payment_proof_url?: string;
  payment_status: 'pending' | 'confirmed' | 'rejected';
  created_at?: string;
  product_title?: string;
}

// Format currency helper
const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export interface CartItem {
  product: CantinaProduct;
  quantity: number;
}

// ==========================================
// 1. PUBLIC CANTEEN STORE COMPONENT
// ==========================================
export const CantinaPublic = ({ onBack }: { onBack: () => void }) => {
  const [products, setProducts] = useState<CantinaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pixCode, setPixCode] = useState('mevamsocialitapema@gmail.com');
  const [eventDate, setEventDate] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  
  // Checkout Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isPixConfirmed, setIsPixConfirmed] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Checkout Method State (online vs reserve)
  const [checkoutMethod, setCheckoutMethod] = useState<'online' | 'reserve'>('online');

  // Paying Voucher States (for completing a reserved voucher payment)
  const [payingVoucher, setPayingVoucher] = useState<CantinaVoucher | null>(null);
  const [payingProofUrl, setPayingProofUrl] = useState<string | null>(null);
  const [payingUploading, setPayingUploading] = useState(false);
  const [payingCopiedPix, setPayingCopiedPix] = useState(false);

  // Auto-reset PIX generated states when cart, name, or phone changes
  useEffect(() => {
    setIsPixConfirmed(false);
    setCopiedPix(false);
  }, [cart, buyerName, buyerPhone]);
  
  // Success Screen State
  const [completedVouchers, setCompletedVouchers] = useState<CantinaVoucher[] | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Buyer Panel Tab & Search States
  const [activeTab, setActiveTab2] = useState<'cardapio' | 'meus_vouchers'>('cardapio');
  const [searchPhone, setSearchPhone] = useState('');
  const [buyerVouchers, setBuyerVouchers] = useState<CantinaVoucher[]>([]);
  const [searchingVouchers, setSearchingVouchers] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedVoucherForTicket, setSelectedVoucherForTicket] = useState<CantinaVoucher | null>(null);

  // Out Of Stock Notification Form State
  const [requestVoucherProduct, setRequestVoucherProduct] = useState<CantinaProduct | null>(null);
  const [requestBuyerName, setRequestBuyerName] = useState('');
  const [requestBuyerPhone, setRequestBuyerPhone] = useState('');
  const [requestQuantity, setRequestQuantity] = useState(1);

  // Cart operations
  const addToCart = (product: CantinaProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, product.quantity_available);
        if (newQty === existing.quantity) {
          setAlertMessage({ type: 'error', text: `Limite de estoque atingido para: ${product.title}.` });
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsPixConfirmed(false);
    setCopiedPix(false);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    setIsPixConfirmed(false);
    setCopiedPix(false);
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const qty = Math.max(1, Math.min(newQty, item.product.quantity_available));
        return { ...item, quantity: qty };
      }
      return item;
    }));
    setIsPixConfirmed(false);
    setCopiedPix(false);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Fetch active products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setAlertMessage({ type: 'error', text: 'Supabase não está configurado. Conecte o banco de dados para listar produtos.' });
        return;
      }
      const { data, error } = await supabase
        .from('cantina_products')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) throw error;
      setProducts(data || []);

      // Fetch app settings relevant to cantina
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['cantina_pix_code', 'cantina_event_date', 'cantina_organizer_phone']);
      
      if (settingsData) {
        const cleanSettingValue = (val: any): string => {
          if (typeof val === 'string') {
            return val.replace(/^"|"$/g, '');
          }
          return String(val);
        };
        const pixSetting = settingsData.find(s => s.key === 'cantina_pix_code');
        if (pixSetting && pixSetting.value !== undefined && pixSetting.value !== null) {
          setPixCode(cleanSettingValue(pixSetting.value));
        }
        const dateSetting = settingsData.find(s => s.key === 'cantina_event_date');
        if (dateSetting && dateSetting.value !== undefined && dateSetting.value !== null) {
          setEventDate(cleanSettingValue(dateSetting.value));
        }
        const organizerSetting = settingsData.find(s => s.key === 'cantina_organizer_phone');
        if (organizerSetting && organizerSetting.value !== undefined && organizerSetting.value !== null) {
          setOrganizerPhone(cleanSettingValue(organizerSetting.value));
        }
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setAlertMessage({ type: 'error', text: 'Não foi possível carregar os produtos: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Helper to generate static PIX Copy and Paste (PIX Copia e Cola)
  const generateStaticPixCopiaCola = (amount: number): string => {
    const pixKey = pixCode || "mevamsocialitapema@gmail.com";
    if (pixKey.startsWith('000201')) {
      return pixKey;
    }
    const keyLengthStr = pixKey.length.toString().padStart(2, '0');
    // Pix account template
    const merchantInfo = `0014br.gov.bcb.pix01${keyLengthStr}${pixKey}`;
    const merchantInfoLengthStr = merchantInfo.length.toString().padStart(2, '0');
    
    const amountStr = amount.toFixed(2);
    const amountLengthStr = amountStr.length.toString().padStart(2, '0');
    const amountPart = `54${amountLengthStr}${amountStr}`;
    
    const merchantName = "MEVAM SOCIAL ITAPEMA";
    const merchantNamePart = `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`;
    
    // Scaffolding up to CRC16 marker (6304). Note using "010211" instead of "010212" for static QR code
    const rawPayload = `00020101021126${merchantInfoLengthStr}${merchantInfo}520400005303986${amountPart}5802BR${merchantNamePart}6007ITAPEMA62070503***6304`;
    
    // Standard CRC16-CCITT (unreflected) with 0xFFFF initialization value and 0x1021 polynomial
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < rawPayload.length; i++) {
      const b = rawPayload.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        const bit = ((b >> (7 - j)) & 1) === 1;
        const c15 = ((crc >> 15) & 1) === 1;
        crc <<= 1;
        if (c15 !== bit) {
          crc ^= polynomial;
        }
      }
    }
    crc &= 0xFFFF;
    const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
    return rawPayload + crcHex;
  };

  // Upload proof of payment
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cantina-${Date.now()}.${fileExt}`;
      const filePath = `cantina_receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('congress-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('congress-proofs')
        .getPublicUrl(filePath);

      setPaymentProofUrl(publicUrl);
      setAlertMessage({ type: 'success', text: 'Comprovante carregado com sucesso!' });
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      setAlertMessage({ 
        type: 'error', 
        text: 'Erro ao carregar comprovante: ' + (error.message === 'Bucket not found' ? 'Bucket "congress-proofs" não encontrado.' : error.message) 
      });
    } finally {
      setUploadingProof(false);
    }
  };

  // Upload proof of payment for existing reserved voucher
  const handlePayingProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPayingUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cantina-pay-${Date.now()}.${fileExt}`;
      const filePath = `cantina_receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('congress-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('congress-proofs')
        .getPublicUrl(filePath);

      setPayingProofUrl(publicUrl);
      setAlertMessage({ type: 'success', text: 'Comprovante do PIX carregado com sucesso!' });
    } catch (error: any) {
      console.error('Error uploading paying receipt:', error);
      setAlertMessage({ 
        type: 'error', 
        text: 'Erro ao carregar comprovante: ' + (error.message === 'Bucket not found' ? 'Bucket "congress-proofs" não encontrado.' : error.message) 
      });
    } finally {
      setPayingUploading(false);
    }
  };

  // Confirm payment for existing reserved voucher
  const handleConfirmPayingVoucherPayment = async () => {
    if (!payingVoucher) return;
    if (!payingProofUrl) {
      setAlertMessage({ type: 'error', text: 'Por favor, anexe o comprovante de pagamento antes de finalizar.' });
      return;
    }

    try {
      const { error } = await supabase
        .from('cantina_vouchers')
        .update({
          payment_proof_url: payingProofUrl,
          payment_status: 'pending' // Set back to pending validation (with real proof)
        })
        .eq('id', payingVoucher.id);

      if (error) throw error;

      // Update local state in the UI list
      setBuyerVouchers(prev => prev.map(v => v.id === payingVoucher.id ? { ...v, payment_proof_url: payingProofUrl } : v));
      setPayingVoucher(null);
      setPayingProofUrl(null);
      setAlertMessage({ type: 'success', text: 'Seu comprovante foi enviado para homologação do pastor responsável!' });
    } catch (error: any) {
      console.error('Error updating voucher payment:', error);
      setAlertMessage({ type: 'error', text: 'Erro ao registrar pagamento: ' + error.message });
    }
  };

  // Submit order for all cart items
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      setAlertMessage({ type: 'error', text: 'Favor preencher nome e telefone.' });
      return;
    }

    // Verify stock first
    for (const item of cart) {
      if (item.quantity < 1 || item.quantity > item.product.quantity_available) {
        setAlertMessage({ type: 'error', text: `Quantidade indisponível para o item: ${item.product.title}.` });
        return;
      }
    }

    setSubmittingOrder(true);
    try {
      const voucherDataArray = cart.map(item => ({
        product_id: item.product.id,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        quantity: item.quantity,
        total_price: Number((item.product.price * item.quantity).toFixed(2)),
        payment_proof_url: checkoutMethod === 'reserve' ? 'reservation' : paymentProofUrl,
        payment_status: 'pending'
      }));

      const { data, error } = await supabase
        .from('cantina_vouchers')
        .insert(voucherDataArray)
        .select();

      if (error) throw error;

      // Optimistically decrement quantity local state for products
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(item => item.product.id === p.id);
        if (cartItem) {
          return { ...p, quantity_available: Math.max(0, p.quantity_available - cartItem.quantity) };
        }
        return p;
      }));

      // Map the inserted data to have product titles
      const hydratedVouchers = (data || []).map(v => {
        const prod = products.find(p => p.id === v.product_id);
        return {
          ...v,
          product_title: prod ? prod.title : 'Produto da Cantina'
        };
      });

      // Success! Form reset
      setCompletedVouchers(hydratedVouchers);
      setCart([]);
      setBuyerName('');
      setBuyerPhone('');
      setPaymentProofUrl(null);
      setIsPixConfirmed(false);
      setCopiedPix(false);
      setCheckoutMethod('online');
    } catch (error: any) {
      console.error('Error submitting order:', error);
      setAlertMessage({ type: 'error', text: 'Não foi possível enviar o pedido: ' + error.message });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Direct WhatsApp notify for multiple vouchers
  const generateWhatsAppShortcut = (vouchers: CantinaVoucher[]) => {
    if (!vouchers || vouchers.length === 0) return '';
    const firstVoucher = vouchers[0];
    const formattedPhone = firstVoucher.buyer_phone.replace(/\D/g, '');
    const cleanPhone = formattedPhone.startsWith('55') ? formattedPhone : '55' + formattedPhone;
    
    // Find product to check for localized organizer phone
    const product = products.find(p => p.id === firstVoucher.product_id);
    const customPhone = product?.organizer_phone || organizerPhone || '47999999999';
    const formattedOrganizer = customPhone.replace(/\D/g, '');
    const finalOrganizerPhone = formattedOrganizer.startsWith('55') || formattedOrganizer === '' ? (formattedOrganizer || '5547999999999') : '55' + formattedOrganizer;

    // Build list of items
    const itemsText = vouchers.map(v => `• *${v.quantity}x ${v.product_title || 'Produto'}* (Subtotal: ${formatPrice(v.total_price)})`).join('\n');
    const grandTotal = vouchers.reduce((acc, v) => acc + v.total_price, 0);
    const codesText = vouchers.map(v => v.id.slice(0, 8).toUpperCase()).join(', ');

    // Pix text details to tell pastor
    const text = `Olá, realizei a compra dos seguintes itens na Cantina MEVAM Itapema Sertão:\n\n${itemsText}\n\n*Valor Total:* ${formatPrice(grandTotal)}\n*Código(s) do(s) Voucher(s):* ${codesText}\n*Nome:* ${firstVoucher.buyer_name}\n\nFavor homologar os vouchers!`;
    
    return `https://api.whatsapp.com/send?phone=${finalOrganizerPhone}&text=${encodeURIComponent(text)}`;
  };

  // Search/Lookup purchased vouchers for client
  const handleLookupVouchers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchPhone.trim()) {
      setAlertMessage({ type: 'error', text: 'Por favor, digite seu telefone ou nome para buscar.' });
      return;
    }
    if (!isSupabaseConfigured) {
      setAlertMessage({ type: 'error', text: 'Supabase não está configurado. Não é possível buscar os vouchers.' });
      return;
    }

    setSearchingVouchers(true);
    setSearched(true);
    try {
      const cleanSearch = searchPhone.trim();
      const cleanPhoneDigits = cleanSearch.replace(/\D/g, '');

      let query = supabase.from('cantina_vouchers').select('*');

      if (cleanPhoneDigits.length >= 4) {
        query = query.or(`buyer_phone.ilike.%${cleanPhoneDigits}%,buyer_name.ilike.%${cleanSearch}%`);
      } else {
        query = query.ilike('buyer_name', `%${cleanSearch}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const hydrated = data.map(v => {
          const prod = products.find(p => p.id === v.product_id);
          return {
            ...v,
            product_title: prod ? prod.title : 'Produto da Cantina'
          };
        });
        setBuyerVouchers(hydrated);
      } else {
        setBuyerVouchers([]);
      }
    } catch (err: any) {
      console.error('Error looking up vouchers:', err);
      setAlertMessage({ type: 'error', text: 'Não foi possível encontrar os vouchers: ' + err.message });
    } finally {
      setSearchingVouchers(false);
    }
  };

  return (
    <div className="py-24 bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <button 
            onClick={onBack}
            className="flex items-center text-stone-500 hover:text-primary transition-colors font-semibold group self-start"
          >
            <ChevronRight className="rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Voltar para o Início
          </button>
          
          <div className="text-left md:text-right flex flex-col items-start md:items-end">
            <div className="flex items-center gap-2 justify-end mb-1 text-primary">
              <Coffee size={24} />
              <h1 className="text-3xl font-black uppercase tracking-tight italic">Cantina MEVAM</h1>
            </div>
            <p className="text-stone-500 text-sm">Adquira seus vouchers online e retire na igreja</p>
            {eventDate && (
              <div className="inline-flex items-center gap-1.5 mt-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                <Clock size={12} className="animate-pulse text-amber-600" />
                Retirada: {eventDate}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs for Client */}
        <div className="flex border-b border-stone-200 mb-8 gap-6">
          <button
            onClick={() => setActiveTab2('cardapio')}
            className={`pb-4 px-2 font-black uppercase text-xs tracking-wider transition-all relative ${
              activeTab === 'cardapio' 
                ? 'text-primary' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Utensils size={16} />
              Cardápio da Cantina
            </div>
            {activeTab === 'cardapio' && (
              <motion.div layoutId="clientTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>

          <button
            onClick={() => setActiveTab2('meus_vouchers')}
            className={`pb-4 px-2 font-black uppercase text-xs tracking-wider transition-all relative ${
              activeTab === 'meus_vouchers' 
                ? 'text-primary' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Ticket size={16} />
              Meus Vouchers (Painel do Comprador)
            </div>
            {activeTab === 'meus_vouchers' && (
              <motion.div layoutId="clientTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Global Warnings */}
        {alertMessage && (
          <div className={`p-5 rounded-2xl mb-8 flex items-start gap-3 border ${
            alertMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              {alertMessage.text}
            </div>
            <button onClick={() => setAlertMessage(null)} className="text-stone-400 hover:text-stone-600">
              <X size={18} />
            </button>
          </div>
        )}

        {/* 2. SUCCESS VIEW */}
        {activeTab === 'cardapio' && completedVouchers && completedVouchers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto bg-white border border-stone-100 rounded-[40px] p-8 md:p-12 shadow-xl shadow-stone-200/50 text-center animate-fadeIn"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
              <CheckCircle size={44} />
            </div>

            <h2 className="text-3xl font-black text-stone-900 tracking-tight leading-none mb-2">
              {completedVouchers[0].payment_proof_url === 'reservation' ? 'Reserva Realizada!' : 'Pedidos Registrados!'}
            </h2>
            <p className="text-stone-500 text-sm max-w-md mx-auto mb-8">
              {completedVouchers[0].payment_proof_url === 'reservation' ? (
                <span>Sua reserva foi concluída com sucesso. Você pode efetuar o pagamento online a qualquer momento pela aba <strong>Meus Vouchers</strong> digitando seu telefone, ou pagar pessoalmente na retirada.</span>
              ) : (
                <span>Seus vouchers foram enviados para análise. Assim que o pagamento for verificado pelos pastores de plantão na cantina, os comprovantes oficiais serão liberados.</span>
              )}
            </p>

            <div className="bg-stone-50 rounded-3xl p-6 mb-8 text-left border border-stone-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-stone-400 font-bold uppercase tracking-wider border-b border-stone-200/50 pb-3 gap-2">
                <span>Cliente: <span className="text-stone-900 font-black normal-case">{completedVouchers[0].buyer_name}</span></span>
                <span>WhatsApp: <span className="text-stone-700 font-semibold">{completedVouchers[0].buyer_phone}</span></span>
              </div>
              
              <div className="space-y-3 divide-y divide-stone-200/40">
                {completedVouchers.map((voucher, idx) => (
                  <div key={voucher.id} className={`pt-3 ${idx === 0 ? 'pt-0 border-t-0' : ''} flex justify-between items-start text-sm`}>
                    <div className="flex-1 pr-4">
                      <p className="font-black text-primary leading-tight">{voucher.product_title}</p>
                      <p className="text-stone-400 text-xs mt-1">Quantidade: {voucher.quantity} un.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-stone-900">{formatPrice(voucher.total_price)}</p>
                      <span className="inline-block font-mono text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded text-[10px] mt-1 font-bold">
                        #{voucher.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-200/50 pt-3 flex justify-between items-end">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Geral</span>
                <span className="text-xl font-black text-emerald-600">
                  {formatPrice(completedVouchers.reduce((sum, v) => sum + v.total_price, 0))}
                </span>
              </div>
            </div>

            {/* Next instructions */}
            <div className="space-y-4">
              <button 
                onClick={() => {
                  // Direct to whatsapp for faster validation
                  window.open(generateWhatsAppShortcut(completedVouchers), '_blank');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl font-bold tracking-wider uppercase text-sm shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle size={20} />
                Agilizar via WhatsApp
              </button>

              <button 
                onClick={() => setCompletedVouchers(null)}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 py-4 px-6 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all cursor-pointer"
              >
                Comprar mais itens
              </button>
            </div>
          </motion.div>
        )}

        {/* 2. CATALOG LISTING */}
        {activeTab === 'cardapio' && !completedVouchers && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-2 space-y-8">
              {loading ? (
                <div className="bg-white rounded-[32px] p-12 border border-stone-100 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-10 h-10 border-4 border-stone-200 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-stone-500 text-sm font-semibold">Carregando cardápio da cantina...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 border border-stone-100 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <Utensils className="text-stone-300 mb-4 h-12 w-12" />
                  <h3 className="text-lg font-black text-stone-800">Cardápio em Construção</h3>
                  <p className="text-stone-500 text-sm max-w-sm mt-1">
                    Atualmente não há produtos disponíveis para venda online. Volte mais tarde!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => {
                    const isOutOfStock = product.quantity_available <= 0;
                    const cartItem = cart.find(item => item.product.id === product.id);
                    const quantityInCart = cartItem ? cartItem.quantity : 0;
                    return (
                      <motion.div 
                        key={product.id}
                        layout
                        className={`bg-white rounded-[32px] overflow-hidden border transition-all ${
                          quantityInCart > 0 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                            : 'border-stone-100 hover:border-stone-200 shadow-sm shadow-stone-100/50'
                        }`}
                      >
                        {/* Image banner */}
                        <div className="h-44 bg-stone-100 relative group overflow-hidden">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                              <Coffee size={36} className="mb-2" />
                              <span className="text-xs font-medium">Cantina MEVAM</span>
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-stone-950">
                            {formatPrice(product.price)}
                          </div>
                          
                          {/* Stock label */}
                          <div className={`absolute bottom-4 left-4 border text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-lg ${
                            isOutOfStock 
                              ? 'bg-amber-50 text-amber-700 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {isOutOfStock ? (
                              product.quantity_extra && product.quantity_extra > 0 
                                ? `Estoque Inicial Esgotado (Extra: ${product.quantity_extra} un)`
                                : 'Estoque esgotado'
                            ) : (
                              `${product.quantity_available} Disponíveis${product.quantity_extra ? ` (+${product.quantity_extra} extra)` : ''}`
                            )}
                          </div>
                        </div>

                        {/* Description & button */}
                        <div className="p-6">
                          <h3 className="text-lg font-black text-stone-900 mb-1 leading-tight">{product.title}</h3>
                          <p className="text-stone-500 text-xs leading-relaxed mb-6 h-12 overflow-hidden line-clamp-3">
                            {product.description || 'Sem descrição adicional disponível.'}
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              if (isOutOfStock) {
                                setRequestVoucherProduct(product);
                                setRequestBuyerName('');
                                setRequestBuyerPhone('');
                                setRequestQuantity(1);
                              } else {
                                addToCart(product);
                              }
                            }}
                            className={`w-full py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isOutOfStock
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/15'
                                : quantityInCart > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10'
                                : 'bg-stone-900 hover:bg-black text-white shadow-md shadow-stone-900/10'
                            }`}
                          >
                            {isOutOfStock ? (
                              <>
                                <MessageCircle size={15} />
                                Solicitar Vouchers Extra
                              </>
                            ) : quantityInCart > 0 ? (
                              <>
                                <Check size={15} />
                                No Carrinho ({quantityInCart}x)
                              </>
                            ) : (
                              <>
                                <ShoppingBag size={15} />
                                Adicionar ao Carrinho
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Checkout Panel */}
            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-stone-100 shadow-sm shadow-stone-100">
              <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2 uppercase mb-1">
                <ShoppingBag size={20} className="text-primary" />
                Seu Carrinho
              </h2>
              <p className="text-stone-500 text-xs mb-6">Preencha seus dados para vincular o voucher de retirada</p>

              {cart.length > 0 ? (
                <form onSubmit={handleSubmitOrder} className="space-y-6">
                  {/* Cart Items list */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                    {cart.map((item) => (
                      <div key={item.product.id} className="bg-stone-50 rounded-2xl p-3 flex gap-3 items-center border border-stone-100 animate-fadeIn">
                        <div className="w-10 h-10 bg-stone-200 rounded-xl overflow-hidden shrink-0">
                          {item.product.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100">
                              <Coffee size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-stone-900 text-xs truncate leading-tight">{item.product.title}</h4>
                          <p className="text-emerald-600 font-bold text-[11px] mt-0.5">{formatPrice(item.product.price)}</p>
                        </div>
                        {/* Quantity adjuster */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-white border border-stone-200 rounded-xl p-1">
                          <button
                            type="button"
                            disabled={item.quantity <= 1}
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 text-xs hover:bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-600 disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-black text-stone-900">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.product.quantity_available}
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 text-xs hover:bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-600 disabled:opacity-30 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeFromCart(item.product.id)} 
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg text-stone-400 shrink-0 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Grand total helper display */}
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 flex justify-between items-center text-sm">
                    <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider">Subtotal ({cart.reduce((sum, i) => sum + i.quantity, 0)} itens)</span>
                    <span className="font-black text-stone-900 text-base">{formatPrice(cartTotal)}</span>
                  </div>

                  {/* Buyer Data inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Seu Nome Completo *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 text-stone-400" size={18} />
                        <input
                          type="text"
                          required
                          placeholder="Digite seu nome"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-850 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">WhatsApp / Telefone *</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-3.5 text-stone-400" size={18} />
                        <input
                          type="tel"
                          required
                          placeholder="(47) 99999-9999"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-855 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selection of Checkout Method */}
                  <div className="bg-stone-50 p-1.5 rounded-2xl border border-stone-200/60 grid grid-cols-2 gap-1.5 mb-4">
                    <button
                      type="button"
                      onClick={() => setCheckoutMethod('online')}
                      className={`py-3 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        checkoutMethod === 'online'
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      💳 Pagar Online
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutMethod('reserve');
                        setIsPixConfirmed(false);
                      }}
                      className={`py-3 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        checkoutMethod === 'reserve'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      ⏳ Reservar Itens
                    </button>
                  </div>

                  {checkoutMethod === 'reserve' ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 text-xs text-stone-850 space-y-2">
                        <p className="font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Ticket size={14} className="text-amber-600" />
                          Como funciona a Reserva?
                        </p>
                        <p className="text-stone-600 leading-relaxed text-[11px]">
                          Seus vouchers serão gerados como <strong className="text-amber-800 font-extrabold">Pendentes</strong>. Você pode:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-500 pl-1 font-semibold">
                          <li>Pagar pessoalmente em dinheiro/cartão/PIX ao retirar.</li>
                          <li>Pagar online via PIX a qualquer momento na aba <strong>Meus Vouchers</strong>.</li>
                        </ul>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingOrder}
                        className="w-full bg-stone-900 hover:bg-black text-white py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all focus:ring-2 focus:ring-stone-900/15 shadow-lg shadow-stone-900/10 flex items-center justify-center gap-2 cursor-pointer animate-fadeIn"
                      >
                        {submittingOrder ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Confirmar Reserva ({formatPrice(cartTotal)})
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Step 1: Pix Generation and Confirmation */
                    !isPixConfirmed ? (
                      <div className="space-y-4">
                        <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-2xl p-4 text-xs text-yellow-905">
                          <p className="font-black uppercase tracking-wide mb-1 flex items-center gap-1.5 text-yellow-800">
                            <QrCode size={14} />
                            Instruções Iniciais para PIX
                          </p>
                          <p className="text-stone-650 leading-relaxed mb-3">
                            Ao prosseguir, geraremos o código Pix Copia e Cola no valor exato do seu carrinho:
                          </p>
                          <div className="flex justify-between items-end border-t border-yellow-200/40 pt-2 text-stone-900 font-bold mb-1">
                            <span>Total PIX:</span>
                            <span className="text-sm font-black text-emerald-600">{formatPrice(cartTotal)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!buyerName.trim() || !buyerPhone.trim()) {
                              setAlertMessage({ type: 'error', text: 'Favor preencher seu Nome e WhatsApp de contato antes de gerar o PIX.' });
                              return;
                            }
                            setIsPixConfirmed(true);
                          }}
                          className="w-full bg-stone-900 hover:bg-black text-white py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all focus:ring-2 focus:ring-stone-900/15 shadow-lg shadow-stone-900/10 flex items-center justify-center gap-2 cursor-pointer animate-fadeIn"
                        >
                          <QrCode size={16} />
                          Gerar PIX Copia e Cola ({formatPrice(cartTotal)})
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Step 2: Pix Code Box with Copy Function */}
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-5 text-xs text-stone-850">
                          <p className="font-black text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-1.5 text-sm">
                            <CheckCircle size={16} className="text-emerald-600 animate-bounce" />
                            PIX Gerado com Sucesso!
                          </p>
                          <p className="text-stone-650 leading-relaxed mb-3">
                            Copie o código Copia e Cola abaixo e realize o pagamento no aplicativo do seu banco:
                          </p>

                          <div className="relative mb-3">
                            <textarea
                              readOnly
                              value={generateStaticPixCopiaCola(cartTotal)}
                              className="w-full h-20 bg-white border border-emerald-150 p-2.5 pr-12 rounded-xl font-mono text-[10px] break-all select-all text-stone-700 outline-none resize-none shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generateStaticPixCopiaCola(cartTotal));
                                setCopiedPix(true);
                                setTimeout(() => setCopiedPix(false), 2000);
                              }}
                              className="absolute right-2 top-2 p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-all flex items-center justify-center cursor-pointer"
                              title="Copiar código PIX"
                            >
                              {copiedPix ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                            </button>
                          </div>

                          {copiedPix && (
                            <p className="text-center font-bold text-emerald-700 mb-3 animate-pulse text-[11px]">
                              ✓ Código PIX copiado com sucesso! Cole no seu banco.
                            </p>
                          )}

                          <div className="text-[11px] text-stone-500 bg-white border border-stone-100 p-2.5 rounded-xl space-y-1">
                            <p><strong>Destinatário:</strong> MEVAM SOCIAL ITAPEMA</p>
                            <p><strong>Chave / Código PIX:</strong> {pixCode}</p>
                            <p><strong>Valor Total:</strong> <span className="text-emerald-600 font-extrabold">{formatPrice(cartTotal)}</span></p>
                          </div>
                        </div>

                        {/* Step 3: Receipt Upload */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block">
                              Passo 2: Anexo do Comprovante (Opcional)
                            </label>
                            <span className="text-[9px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold">Recomendado</span>
                          </div>
                          <div className="border-2 border-dashed border-stone-200 hover:border-stone-300 rounded-2xl p-4 text-center transition-colors relative bg-white">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleProofUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={uploadingProof}
                            />
                            <Upload className="mx-auto text-stone-400 mb-1.5" size={20} />
                            <p className="text-[11px] font-bold text-stone-600">
                              {uploadingProof ? 'Enviando imagem...' : paymentProofUrl ? '✓ Comprovante anexado!' : 'Anexe o Comprovante do PIX'}
                            </p>
                            <p className="text-[9px] text-stone-400 mt-0.5">JPEG, PNG até 5MB</p>
                          </div>
                          {paymentProofUrl && (
                            <div className="mt-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg flex items-center gap-1">
                              <Check size={12} />
                              Imagem vinculada com sucesso!
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsPixConfirmed(false)}
                            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-750 py-4 px-4 rounded-2xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer"
                          >
                            Alterar Pedido
                          </button>
                          <button
                            type="submit"
                            disabled={submittingOrder || uploadingProof}
                            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-xs transition-all focus:ring-2 focus:ring-emerald-600/15 disabled:opacity-50 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {submittingOrder ? (
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check size={18} />
                                Finalizar Compra
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </form>
              ) : (
                <div className="text-center py-12 text-stone-400 border border-dashed border-stone-100 rounded-2xl">
                  <Coffee size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold max-w-[180px] mx-auto">Seu carrinho está vazio. Adicione itens clicando em "Adicionar ao Carrinho" no cardápio ao lado!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. BUYER PANEL - MY VOUCHERS / RECEIPTS */}
        {activeTab === 'meus_vouchers' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Search Box Card */}
            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-stone-100 shadow-sm shadow-stone-100/50">
              <div className="max-w-xl">
                <h3 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2 uppercase mb-2">
                  <Search size={22} className="text-primary" />
                  Localizar Meus Vouchers
                </h3>
                <p className="text-stone-500 text-xs mb-6 leading-relaxed">
                  Digite seu **Nome Completo** ou o **WhatsApp / Telefone** informado na compra para localizar os seus vouchers da cantina, visualizando o comprovante oficial e o status de pagamento.
                </p>

                <form onSubmit={handleLookupVouchers} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-4 top-3.5 text-stone-400" size={18} />
                    <input
                      type="text"
                      placeholder="Telefone ou Nome Completo"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-90 *0 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingVouchers}
                    className="bg-stone-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {searchingVouchers ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search size={14} />
                        Consultar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Results Grid */}
            {searched && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Ticket size={16} className="text-stone-400" />
                    Resultados Gerais ({buyerVouchers.length})
                  </h4>
                  {buyerVouchers.length > 0 && (
                    <span className="text-xs text-stone-400 italic">Clique para abrir o comprovante oficial</span>
                  )}
                </div>

                {buyerVouchers.length === 0 ? (
                  <div className="bg-white rounded-[32px] p-12 border border-stone-100 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <Utensils className="text-stone-300 mb-4 h-12 w-12 opacity-40 animate-pulse" />
                    <h5 className="text-lg font-black text-stone-800">Nenhum registro localizado</h5>
                    <p className="text-stone-500 text-xs max-w-sm mt-1.5 leading-relaxed">
                      Não encontramos compras vinculadas a "<strong className="text-stone-700">{searchPhone}</strong>". Verifique a ortografia ou mude o termo de busca.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buyerVouchers.map((voucher) => {
                      const idShort = voucher.id.slice(0, 8).toUpperCase();
                      const status = voucher.payment_status;
                      const isReservation = status === 'pending' && (voucher.payment_proof_url === 'reservation' || !voucher.payment_proof_url);

                      return (
                        <div 
                          key={voucher.id}
                          className="bg-white rounded-[32px] p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top */}
                            <div className="flex justify-between items-center mb-4 border-b border-stone-50 pb-3">
                              <span className="font-mono text-[11px] text-stone-400 font-extrabold bg-stone-100 px-2.5 py-1 rounded-lg">
                                #{idShort}
                              </span>
                              
                              <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg border ${
                                status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 font-bold'
                                  : status === 'rejected'
                                  ? 'bg-red-50 text-red-600 border-red-100 font-bold'
                                  : isReservation
                                  ? 'bg-amber-50 text-amber-600 border-amber-100 font-bold font-extrabold'
                                  : 'bg-yellow-50 text-yellow-600 border-yellow-100 font-bold animate-pulse'
                              }`}>
                                {status === 'confirmed' 
                                  ? '✓ Homologado' 
                                  : status === 'rejected' 
                                  ? '✕ Recusado' 
                                  : isReservation 
                                  ? '⏳ Reserva Pendente' 
                                  : '⏳ Analisando PIX'}
                              </span>
                            </div>

                            {/* Item Title */}
                            <h5 className="font-black text-stone-900 text-lg mb-1 leading-tight tracking-tight">
                              {voucher.product_title}
                            </h5>
                            <p className="text-stone-500 text-xs mb-4">
                              Qtde: <strong className="text-stone-800">{voucher.quantity} un.</strong> • {isReservation ? 'Total a Pagar:' : 'Total Pago:'} <strong className="text-stone-900 font-black">{formatPrice(voucher.total_price)}</strong>
                            </p>

                            <div className="bg-stone-50 rounded-2xl p-3 text-xs mb-5 text-stone-600 space-y-1.5 border border-stone-100">
                              <p className="truncate">👤 Cliente: <span className="font-bold text-stone-850">{voucher.buyer_name}</span></p>
                              {eventDate && <p>📅 Retirada: <span className="font-bold text-amber-800">{eventDate}</span></p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {isReservation && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingVoucher(voucher);
                                  setPayingProofUrl(null);
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer mb-1"
                              >
                                <QrCode size={14} />
                                Pagar Online (PIX)
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedVoucherForTicket(voucher)}
                              className={`w-full py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                                status === 'confirmed'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 shadow-md shadow-emerald-600/10'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-150'
                              }`}
                            >
                              <Receipt size={14} />
                              Ver Comprovante Oficial
                            </button>

                            {status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => window.open(generateWhatsAppShortcut(voucher), '_blank')}
                                className="w-full bg-white hover:bg-emerald-50/35 text-emerald-600 border border-emerald-250/60 py-2.5 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <MessageCircle size={12} className="text-emerald-500" />
                                Agilizar no WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VOUCHER TICKET / RECEIPT MODAL */}
        <AnimatePresence>
          {selectedVoucherForTicket && (
            <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
              {/* Card wrapper */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="bg-white rounded-[40px] w-full max-w-md shadow-2xl relative border border-stone-200/50 overflow-hidden flex flex-col justify-between"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedVoucherForTicket(null)}
                  className="absolute top-6 right-6 p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-all z-20 hover:text-stone-850"
                >
                  <X size={18} />
                </button>

                {/* Ticket Details (Print Content) */}
                <div id="print-vouchers-area" className="p-8 pb-4 relative">
                  {/* Church Brand Header */}
                  <div className="text-center mb-6 pt-2">
                    <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-3">
                      <Coffee size={28} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">MEVAM Itapema Sertão</span>
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight leading-none mt-1">CANTINA MEVAM</h3>
                    <p className="text-stone-500 text-[10px] uppercase font-bold tracking-wider mt-1.5">Comprovante de Voucher</p>
                  </div>

                  {/* Elegant Horizontal Notch Tear-Off Divider */}
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute left-[-42px] w-5 h-10 bg-stone-950 rounded-r-full border-r border-stone-900/10 z-10" />
                    <div className="absolute right-[-42px] w-5 h-10 bg-stone-950 rounded-l-full border-l border-stone-900/10 z-10" />
                    <div className="w-full border-t-2 border-dashed border-stone-200" />
                  </div>

                  {/* Voucher Specs */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                      <span className="text-[10px] text-stone-400 uppercase font-black tracking-wider">Código de Resgate</span>
                      <span className="font-mono text-stone-800 font-black bg-stone-200/85 px-3 py-1 rounded-xl text-xs uppercase">
                        #{selectedVoucherForTicket.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5 border-b border-stone-100 pb-3">
                      <label className="text-[9px] text-stone-400 uppercase font-black tracking-wider block">Produto Adquirido</label>
                      <h4 className="text-xl font-black text-stone-900 leading-tight">
                        {selectedVoucherForTicket.product_title}
                      </h4>
                      <p className="text-stone-600 text-sm">
                        Quantidade: <strong className="text-stone-900 font-bold">{selectedVoucherForTicket.quantity} un.</strong> • Total: <strong className="text-emerald-600 font-extrabold">{formatPrice(selectedVoucherForTicket.total_price)}</strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-stone-400 uppercase font-black tracking-wider block mb-0.5">Cliente</label>
                        <p className="font-black text-stone-900 text-xs truncate leading-tight">{selectedVoucherForTicket.buyer_name}</p>
                      </div>
                      <div>
                        <label className="text-[9px] text-stone-400 uppercase font-black tracking-wider block mb-0.5">WhatsApp / Celular</label>
                        <p className="font-semibold text-stone-700 text-xs leading-tight">{selectedVoucherForTicket.buyer_phone}</p>
                      </div>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-3xl border border-stone-100 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Data de Registro:</span>
                        <span className="font-bold text-stone-600">
                          {selectedVoucherForTicket.created_at ? new Date(selectedVoucherForTicket.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                        </span>
                      </div>
                      {eventDate && (
                        <div className="flex justify-between">
                          <span className="text-stone-400">Retirada na Igreja:</span>
                          <span className="font-black text-amber-700 uppercase tracking-widest text-[10px]">{eventDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Vector Barcode Decorator */}
                    <div className="pt-2 text-center">
                      <div className="flex justify-center items-center gap-0.5 h-12 bg-white px-4 border border-stone-200 rounded-2xl max-w-xs mx-auto overflow-hidden shadow-inner">
                        {[2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2].map((w, idx) => (
                          <div key={idx} className="bg-stone-950 h-full" style={{ width: `${w}px` }} />
                        ))}
                      </div>
                      <span className="text-[8px] font-mono text-stone-405 uppercase tracking-widest mt-1 block">
                        VOUCHER-{selectedVoucherForTicket.id}
                      </span>
                    </div>

                    {/* Status Stamp Badge */}
                    <div className="pt-2">
                      {selectedVoucherForTicket.payment_status === 'confirmed' ? (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[20px] py-3.5 px-4 text-center shadow-md">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100 mb-0.5">Status do Voucher</p>
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle size={18} className="text-white shrink-0" />
                            <span className="font-black text-xs uppercase tracking-wider">✓ HOMOLOGADO - APRESENTAR NA CANTINA</span>
                          </div>
                        </div>
                      ) : selectedVoucherForTicket.payment_status === 'rejected' ? (
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-[20px] py-3.5 px-4 text-center shadow-md">
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-100 mb-0.5">Status do Voucher</p>
                          <div className="flex items-center justify-center gap-2">
                            <X size={18} className="text-white shrink-0" />
                            <span className="font-black text-xs uppercase tracking-wider">✕ COMPROVANTE NÃO CONFIRMADO</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-400 text-amber-950 rounded-[20px] py-3.5 px-4 text-center border border-amber-500/20 shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 mb-0.5">Status do Voucher</p>
                          <div className="flex items-center justify-center gap-2">
                            <Clock size={18} className="text-amber-800 shrink-0" />
                            <span className="font-black text-xs uppercase tracking-wider">AGUARDANDO VALIDAÇÃO DO PIX</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 pt-3 space-y-2 border-t border-stone-50 bg-stone-50 rounded-b-[40px]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const copyText = `*COMPROVANTE DE VOUCHER - CANTINA MEVAM*\n\n🎟️ *Voucher ID:* #${selectedVoucherForTicket.id.slice(0, 8).toUpperCase()}\n👤 *Cliente:* ${selectedVoucherForTicket.buyer_name}\n🍔 *Item:* ${selectedVoucherForTicket.quantity}x ${selectedVoucherForTicket.product_title}\n💰 *Valor:* ${formatPrice(selectedVoucherForTicket.total_price)}\n📅 *Status:* ${selectedVoucherForTicket.payment_status === 'confirmed' ? '✅ Homologado / Pronto para Retirada' : selectedVoucherForTicket.payment_status === 'rejected' ? '❌ Recusado' : '⏳ Aguardando Validação'}\n📍 *Retirada:* ${eventDate || 'No dia do evento'}\n\nApresente na cantina para receber seu lanche!`;
                        navigator.clipboard.writeText(copyText);
                        setAlertMessage({ type: 'success', text: 'Comprovante em texto copiado para o seu WhatsApp!' });
                      }}
                      className="bg-stone-900 hover:bg-black text-white py-3.5 px-4 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy size={13} />
                      Copiar Para Zap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const printable = document.getElementById('print-vouchers-area');
                        if (printable) {
                          const originalContent = document.body.innerHTML;
                          const printContent = printable.innerHTML;
                          
                          // Custom minimal printable setup
                          document.body.innerHTML = `
                            <div style="font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; padding: 20px;">
                              <div style="width: 100%; max-width: 360px; border: 1px solid #e1e1e1; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                ${printContent}
                              </div>
                            </div>
                          `;
                          window.print();
                          window.location.reload();
                        }
                      }}
                      className="bg-white hover:bg-stone-100 text-stone-800 border border-stone-250 py-3.5 px-4 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Printer size={13} />
                      Imprimir CPF
                    </button>
                  </div>

                  {selectedVoucherForTicket.payment_status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => window.open(generateWhatsAppShortcut(selectedVoucherForTicket), '_blank')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} />
                      Confirmar por WhatsApp
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL COMPLEMENTO DE PAGAMENTO DE RESERVA */}
        <AnimatePresence>
          {payingVoucher && (
            <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="bg-white rounded-[40px] w-full max-w-md shadow-2xl relative border border-stone-200/50 overflow-hidden flex flex-col"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPayingVoucher(null)}
                  className="absolute top-6 right-6 p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-all z-20 hover:text-stone-850"
                >
                  <X size={18} />
                </button>

                <div className="p-8 pb-4">
                  {/* Header */}
                  <div className="text-center mb-6 pt-2">
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-3">
                      <QrCode size={28} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Pagamento Online</span>
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight leading-none mt-1">Pagar #{payingVoucher.id.slice(0, 8).toUpperCase()}</h3>
                    <p className="text-stone-500 text-xs mt-1.5 font-bold">{payingVoucher.product_title}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Pix Code Box with Copy Function */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-5 text-xs text-stone-850">
                      <p className="font-black text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-1.5 text-sm">
                        <CheckCircle size={16} className="text-emerald-600" />
                        Pague com PIX
                      </p>
                      <p className="text-stone-650 leading-relaxed mb-3">
                        Copie o código Copia e Cola abaixo e pague no aplicativo do seu banco:
                      </p>

                      <div className="relative mb-3">
                        <textarea
                          readOnly
                          value={generateStaticPixCopiaCola(payingVoucher.total_price)}
                          className="w-full h-20 bg-white border border-emerald-150 p-2.5 pr-12 rounded-xl font-mono text-[10px] break-all select-all text-stone-700 outline-none resize-none shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generateStaticPixCopiaCola(payingVoucher.total_price));
                            setPayingCopiedPix(true);
                            setTimeout(() => setPayingCopiedPix(false), 2000);
                          }}
                          className="absolute right-2 top-2 p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-all flex items-center justify-center cursor-pointer"
                          title="Copiar código PIX"
                        >
                          {payingCopiedPix ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                        </button>
                      </div>

                      {payingCopiedPix && (
                        <p className="text-center font-bold text-emerald-700 mb-3 animate-pulse text-[11px]">
                          ✓ Código PIX copiado com sucesso!
                        </p>
                      )}

                      <div className="text-[11px] text-stone-500 bg-white border border-stone-100 p-2.5 rounded-xl space-y-1">
                        <p><strong>Destinatário:</strong> MEVAM SOCIAL ITAPEMA</p>
                        <p><strong>Valor Total:</strong> <span className="text-emerald-600 font-extrabold">{formatPrice(payingVoucher.total_price)}</span></p>
                      </div>
                    </div>

                    {/* Receipt Upload */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block">
                          Anexar Comprovante do PIX
                        </label>
                        <span className="text-[9px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold">Obrigatório</span>
                      </div>
                      <div className="border-2 border-dashed border-stone-200 hover:border-stone-300 rounded-2xl p-4 text-center transition-colors relative bg-white">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handlePayingProofUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={payingUploading}
                        />
                        <Upload className="mx-auto text-stone-400 mb-1.5" size={20} />
                        <p className="text-[11px] font-bold text-stone-600">
                          {payingUploading ? 'Enviando imagem...' : payingProofUrl ? '✓ Comprovante anexado!' : 'Anexe o Comprovante do PIX'}
                        </p>
                        <p className="text-[9px] text-stone-400 mt-0.5">JPEG, PNG até 5MB</p>
                      </div>
                      {payingProofUrl && (
                        <div className="mt-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg flex items-center gap-1">
                          <Check size={12} />
                          Imagem vinculada com sucesso!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-3 space-y-2 border-t border-stone-50 bg-stone-50 rounded-b-[40px] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingVoucher(null)}
                    className="flex-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 py-3.5 px-4 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayingVoucherPayment}
                    disabled={payingUploading || !payingProofUrl}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL PARA SOLICITAR VOUCHERS ADICIONAIS SE ESGOTOU */}
        <AnimatePresence>
          {requestVoucherProduct && (
            <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-md shadow-2xl relative border border-stone-100 overflow-hidden"
              >
                {/* Header with yellow notification design */}
                <div className="bg-amber-500 text-amber-955 p-6 relative">
                  <button
                    type="button"
                    onClick={() => setRequestVoucherProduct(null)}
                    className="absolute top-6 right-6 p-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-950 rounded-full transition-all"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex gap-3 items-center mb-1">
                    <AlertCircle className="text-amber-950 stroke-[2.5]" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 leading-none">Estoque Inicial Esgotado</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight leading-snug text-stone-950">
                    Solicitar Vouchers Extras
                  </h3>
                </div>

                <div className="p-8 space-y-5">
                  <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block mb-1">Item Selecionado</span>
                    <h4 className="font-extrabold text-stone-900 text-sm leading-tight mb-1">{requestVoucherProduct.title}</h4>
                    <p className="text-stone-500 text-xs truncate">{requestVoucherProduct.description || "Deliciosa opção da nossa cantina."}</p>
                    {requestVoucherProduct.quantity_extra && requestVoucherProduct.quantity_extra > 0 ? (
                      <div className="mt-2 bg-amber-50 border border-amber-100 py-1 px-2.5 rounded-lg text-[10px] text-amber-800 font-bold inline-block">
                        Estoque Extra de Reserva: {requestVoucherProduct.quantity_extra} un.
                      </div>
                    ) : null}
                  </div>

                  <p className="text-stone-500 text-xs leading-relaxed">
                    A quantidade inicial disponível para compra imediata se esgotou. Preencha seus dados para enviar uma mensagem ao organizador solicitando a liberação de mais vouchers.
                  </p>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!requestBuyerName.trim() || !requestBuyerPhone.trim()) {
                        alert('Favor preencher o seu nome e telefone.');
                        return;
                      }
                      
                      // Format request message
                      const text = `Olá organizador da Cantina MEVAM Itapema Sertão! O estoque do produto *${requestVoucherProduct.title}* se esgotou, e gostaria de solicitar a liberação de *${requestQuantity} voucher(s)* extras para mim.\n\n*Nome:* ${requestBuyerName.trim()}\n*WhatsApp:* ${requestBuyerPhone.trim()}\n\nPor favor, confirme se há disponibilidade desse estoque extra! Obrigado.`;
                      
                      // Resolve phone
                      const targetPhone = requestVoucherProduct.organizer_phone || organizerPhone || '47999999999';
                      const formattedOrganizer = targetPhone.replace(/\D/g, '');
                      const finalPhone = formattedOrganizer.startsWith('55') || formattedOrganizer === '' ? (formattedOrganizer || '5547999999999') : '55' + formattedOrganizer;
                      
                      const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                      setRequestVoucherProduct(null);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Seu Nome Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Como deseja ser chamado"
                        value={requestBuyerName}
                        onChange={(e) => setRequestBuyerName(e.target.value)}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Seu Celular / WhatsApp *</label>
                        <input
                          type="tel"
                          required
                          placeholder="(47) 99999-9999"
                          value={requestBuyerPhone}
                          onChange={(e) => setRequestBuyerPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Quantidade *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={requestQuantity}
                          onChange={(e) => setRequestQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm text-center font-black"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 py-3.5 px-6 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 mt-2"
                    >
                      <MessageCircle size={16} />
                      Enviar Solicitação no WhatsApp
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


// ==========================================
// 2. PASTOR/ADMIN MANAGEMENT COMPONENT
// ==========================================
export const CantinaAdmin = ({ 
  setConfirmModal, 
  setIsMinistryLoading,
  isCantinaOpen = false,
  setIsCantinaOpen,
  cantinaPixCode = '',
  setCantinaPixCode,
  cantinaEventDate = '',
  setCantinaEventDate
}: { 
  setConfirmModal: any, 
  setIsMinistryLoading: any,
  isCantinaOpen?: boolean,
  setIsCantinaOpen?: (open: boolean) => void,
  cantinaPixCode?: string,
  setCantinaPixCode?: (code: string) => void,
  cantinaEventDate?: string,
  setCantinaEventDate?: (date: string) => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'vouchers' | 'produtos'>('vouchers');
  
  // Settings management states
  const [savingSettings, setSavingSettings] = useState(false);
  const [localOrganizerPhone, setLocalOrganizerPhone] = useState('');
  const [localPixCode, setLocalPixCode] = useState(cantinaPixCode);
  const [localEventDate, setLocalEventDate] = useState(cantinaEventDate);

  // Sync prop changes to local form state
  useEffect(() => {
    setLocalPixCode(cantinaPixCode);
  }, [cantinaPixCode]);

  useEffect(() => {
    setLocalEventDate(cantinaEventDate);
  }, [cantinaEventDate]);

  const handleToggleCantinaOpen = async (newValue: boolean) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'cantina_enabled', value: newValue, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (setIsCantinaOpen) setIsCantinaOpen(newValue);
    } catch (err) {
      console.error('Error toggling cantina status:', err);
      alert('Erro ao atualizar status da cantina.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePixCode = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'cantina_pix_code', value: localPixCode, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (setCantinaPixCode) setCantinaPixCode(localPixCode);
      alert('Código / Chave PIX da cantina salvo com sucesso!');
    } catch (err) {
      console.error('Error saving PIX code:', err);
      alert('Erro ao salvar o código / chave PIX.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveEventDate = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'cantina_event_date', value: localEventDate, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (setCantinaEventDate) setCantinaEventDate(localEventDate);
      alert('Data do evento da cantina salva com sucesso!');
    } catch (err) {
      console.error('Error saving event date:', err);
      alert('Erro ao salvar a data do evento.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveOrganizerPhone = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'cantina_organizer_phone', value: localOrganizerPhone, updated_at: new Date().toISOString() });
      if (error) throw error;
      alert('Telefone do organizador salvo com sucesso!');
    } catch (err) {
      console.error('Error saving organizer phone:', err);
      alert('Erro ao salvar telefone do organizador: ' + (err as any).message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Products Management States
  const [products, setProducts] = useState<CantinaProduct[]>([]);
  const [vouchers, setVouchers] = useState<CantinaVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Selected state for edit/add
  const [productForm, setProductForm] = useState<{
    id?: string,
    title: string,
    description: string,
    price: number,
    image_url: string,
    quantity_available: number,
    organizer_phone: string,
    quantity_extra: number,
    is_active: boolean
  }>({
    title: '',
    description: '',
    price: 0,
    image_url: '',
    quantity_available: 0,
    organizer_phone: '',
    quantity_extra: 0,
    is_active: true
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        console.warn('Supabase não configurado. Pulando busca de dados da cantina.');
        return;
      }
      const productsRes = await supabase.from('cantina_products').select('*').order('created_at', { ascending: false });
      const vouchersRes = await supabase.from('cantina_vouchers').select('*').order('created_at', { ascending: false });
      
      if (productsRes.data) setProducts(productsRes.data);
      if (vouchersRes.data) {
        // Hydrate product names to make vouchers beautiful
        const hydrated = vouchersRes.data.map(v => {
          const prod = productsRes.data?.find(p => p.id === v.product_id);
          return {
            ...v,
            product_title: prod ? prod.title : 'Produto Excluído'
          };
        });
        setVouchers(hydrated);
      }

      // Fetch global organizer phone setting
      const { data: globalPhone } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'cantina_organizer_phone')
        .maybeSingle();
      if (globalPhone && globalPhone.value) {
        setLocalOrganizerPhone(globalPhone.value);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Upload Product Picture
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;
      const filePath = `cantina_products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('congress-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('congress-proofs')
        .getPublicUrl(filePath);

      setProductForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Erro ao carregar imagem: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title || productForm.price <= 0) {
      alert('Preencha título e preço corretamente.');
      return;
    }

    try {
      setIsMinistryLoading(true);
      const isNew = !productForm.id;
      
      const payload = {
        title: productForm.title,
        description: productForm.description,
        price: Number(productForm.price),
        image_url: productForm.image_url,
        quantity_available: Math.max(0, Math.floor(productForm.quantity_available)),
        organizer_phone: productForm.organizer_phone || '',
        quantity_extra: Math.max(0, Math.floor(productForm.quantity_extra || 0)),
        is_active: productForm.is_active
      };

      if (isNew) {
        const { error } = await supabase.from('cantina_products').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cantina_products').update(payload).eq('id', productForm.id);
        if (error) throw error;
      }

      // Reset
      setIsEditingProduct(false);
      setProductForm({
        title: '',
        description: '',
        price: 0,
        image_url: '',
        quantity_available: 0,
        organizer_phone: '',
        quantity_extra: 0,
        is_active: true
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: `Tem certeza que deseja apagar permanentemente o produto "${name}"? Todos os vouchers atrelados a ele serão impactados.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsMinistryLoading(true);
        try {
          const { error } = await supabase.from('cantina_products').delete().eq('id', id);
          if (error) throw error;
          fetchData();
        } catch (error: any) {
          console.error('Error deleting product:', error);
          alert('Erro ao apagar produto: ' + error.message);
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  // Update payment status (Approve / Reject)
  const handleUpdateVoucherStatus = async (voucher: CantinaVoucher, newStatus: 'confirmed' | 'rejected') => {
    try {
      setIsMinistryLoading(true);
      
      // Se estamos confirmando, debitar o estoque
      if (newStatus === 'confirmed' && voucher.payment_status !== 'confirmed') {
        const prod = products.find(p => p.id === voucher.product_id);
        if (prod) {
          const newQty = Math.max(0, prod.quantity_available - voucher.quantity);
          await supabase.from('cantina_products').update({ quantity_available: newQty }).eq('id', prod.id);
        }
      }

      const { error } = await supabase
        .from('cantina_vouchers')
        .update({ payment_status: newStatus })
        .eq('id', voucher.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Error updating voucher status:', error);
      alert('Erro ao atualizar status: ' + error.message);
    } finally {
      setIsMinistryLoading(false);
    }
  };

  // Delete voucher
  const handleDeleteVoucher = (id: string, buyer: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Voucher',
      message: `Deseja permanentemente excluir o registro de compra do voucher do(a) "${buyer}"?`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsMinistryLoading(true);
        try {
          const { error } = await supabase.from('cantina_vouchers').delete().eq('id', id);
          if (error) throw error;
          fetchData();
        } catch (error: any) {
          console.error('Error deleting voucher:', error);
          alert('Erro ao excluir voucher: ' + error.message);
        } finally {
          setIsMinistryLoading(false);
        }
      }
    });
  };

  // Generate WhatsApp Official homologated proof layout
  const handleShareVoucherWhatsApp = (voucher: CantinaVoucher) => {
    const formattedPhone = voucher.buyer_phone.replace(/\D/g, '');
    const cleanPhone = formattedPhone.startsWith('55') ? formattedPhone : '55' + formattedPhone;
    
    const text = `*COMPROVANTE DE VOUCHER - CANTINA MEVAM ITAPEMA SERTÃO*\n\nOlá *${voucher.buyer_name}*, seu pagamento Pix foi homologado pelos pastores com sucesso!\n\n🎟️ *Voucher:* ${voucher.id.slice(0, 8).toUpperCase()}\n🍔 *Item:* ${voucher.product_title}\n🔢 *Quantidade:* ${voucher.quantity}\n💰 *Total Pago:* ${formatPrice(voucher.total_price)}\n\n*Apresente este comprovante do WhatsApp na cantina para receber seu pedido.*\n\nDeus lhe abençoe rica e abundantemente!`;
    
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Link generator for public sharing
  const copyCanteenLink = () => {
    const link = `${window.location.origin}/#cantina`;
    navigator.clipboard.writeText(link);
    alert('Link público da cantina copiado com sucesso! envie pelo WhatsApp ou redes sociais.');
  };

  // Filters calculation
  const filteredVouchers = vouchers.filter(v => {
    const matchStatus = filterStatus === 'all' || v.payment_status === filterStatus;
    const matchSearch = v.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        v.buyer_phone.includes(searchTerm) ||
                        v.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Canteen Top Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-stone-100 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center">
            <Coffee size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase italic text-stone-900">Cantina & Vouchers</h2>
            <p className="text-stone-500 text-sm">Controle de caixa, vendas online e fichas virtuais</p>
          </div>
        </div>

        {/* Sharing capabilities */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={copyCanteenLink}
            className="px-4 py-3 flex-1 sm:flex-none border border-stone-200 hover:border-stone-300 text-stone-600 font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
          >
            <Copy size={14} />
            Link de Venda
          </button>
          
          <button
            onClick={() => setActiveSubTab(activeSubTab === 'vouchers' ? 'produtos' : 'vouchers')}
            className="px-4 py-3 flex-1 sm:flex-none bg-stone-900 hover:bg-black text-white font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-stone-900/10"
          >
            {activeSubTab === 'vouchers' ? <Utensils size={14} /> : <ShoppingBag size={14} />}
            {activeSubTab === 'vouchers' ? 'Configurar Cardápio' : 'Área de Vendas'}
          </button>
        </div>
      </div>

      {/* CONFIG PANEL FOR THE CANTEEN CAMPAIGN AND STATUS */}
      {!loading && (
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-[24px] p-6 shadow-xl relative overflow-hidden mb-8 border border-stone-800">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Coffee size={200} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-800/80">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-4 bg-stone-800/40 rounded-2xl border border-stone-800">
                <div className="pr-4">
                  <p className="text-amber-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Status de Exibição
                  </p>
                  <h4 className="text-sm font-extrabold uppercase">Habilitar na Página Inicial</h4>
                  <p className="text-stone-400 text-[11px] mt-0.5">Controla se o cardápio e a seção aparecem na Home.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCantinaOpen(!isCantinaOpen)}
                  disabled={savingSettings}
                  className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${isCantinaOpen ? 'bg-emerald-500' : 'bg-stone-600'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm ${isCantinaOpen ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Event Date Setting */}
              <div className="p-4 bg-stone-800/40 rounded-2xl border border-stone-800 flex flex-col justify-between">
                <div>
                  <p className="text-amber-500 text-[10px] uppercase font-black tracking-widest mb-1.5">Data do Evento da Cantina</p>
                  <p className="text-stone-400 text-[11px] mb-2">Exibido aos membros para organização das compras.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Próximo Domingo (28/06) às 18:30"
                    value={localEventDate}
                    onChange={(e) => setLocalEventDate(e.target.value)}
                    className="bg-stone-800 border border-stone-700 text-white placeholder-stone-500 px-3.5 py-2.5 rounded-xl text-xs flex-1 focus:outline-none focus:border-stone-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEventDate}
                    disabled={savingSettings}
                    className="bg-white hover:bg-stone-100 text-stone-900 font-bold px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign PIX Code Field */}
            <div>
              <p className="text-stone-300 text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                Configurar Código ou Chave PIX da Cantina (Obrigatório)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  rows={2}
                  placeholder="Cole aqui a sua Chave PIX (e-mail, celular, CNPJ, etc.) ou o código completo PIX Copia e Cola para a campanha."
                  value={localPixCode}
                  onChange={(e) => setLocalPixCode(e.target.value)}
                  className="bg-stone-800 border border-stone-700 text-white placeholder-stone-500 px-4 py-2.5 rounded-xl text-sm flex-1 focus:outline-none focus:border-stone-500 transition-all font-mono resize-none"
                />
                <button
                  type="button"
                  onClick={handleSavePixCode}
                  disabled={savingSettings}
                  className="bg-white hover:bg-stone-100 text-stone-900 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 h-fit self-end sm:self-center"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar Código PIX'}
                </button>
              </div>
              <p className="text-stone-400 text-[10px] mt-1.5 font-medium">
                Insira uma chave PIX (como e-mail ou celular) para gerar os códigos automaticamente no carrinho do cliente, ou cole o código Copia e Cola completo para usá-lo de forma estática.
              </p>
            </div>

            {/* Global Organizer Phone Field */}
            <div>
              <p className="text-stone-300 text-[10px] uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                Telefone Geral do Organizador da Cantina (WhatsApp)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ex: (47) 99999-9999"
                  value={localOrganizerPhone}
                  onChange={(e) => setLocalOrganizerPhone(e.target.value)}
                  className="bg-stone-800 border border-stone-700 text-white placeholder-stone-500 px-4 py-2.5 rounded-xl text-sm flex-1 focus:outline-none focus:border-stone-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveOrganizerPhone}
                  disabled={savingSettings}
                  className="bg-white hover:bg-stone-100 text-stone-900 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar Telefone'}
                </button>
              </div>
              <p className="text-stone-400 text-[10px] mt-1.5 font-medium">
                Caso um produto específico não tenha telefone cadastrado, os usuários enviarão suas solicitações para este número.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-stone-200 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-stone-500 text-sm font-semibold">Carregando painel da cantina...</p>
        </div>
      ) : activeSubTab === 'produtos' ? (
        // ==========================================
        // ADMIN PANEL: PRODUCT MANAGEMENT
        // ==========================================
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">Produtos do Cardápio</h3>
            
            {!isEditingProduct && (
              <button
                onClick={() => {
                  setProductForm({
                    title: '',
                    description: '',
                    price: 0,
                    image_url: '',
                    quantity_available: 0,
                    organizer_phone: '',
                    quantity_extra: 0,
                    is_active: true
                  });
                  setIsEditingProduct(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Plus size={16} />
                Adicionar Produto
              </button>
            )}
          </div>

          {isEditingProduct && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              onSubmit={handleSaveProduct} 
              className="bg-stone-50 border border-stone-200/60 rounded-3xl p-6 space-y-6"
            >
              <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest border-b border-stone-200 pb-2">
                {productForm.id ? 'Editar Produto' : 'Cadastrar Novo Item'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={productForm.title}
                    onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Preço Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Descrição / Detalhes</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Quantidade Inicial em Estoque</label>
                  <input
                    type="number"
                    required
                    value={productForm.quantity_available}
                    onChange={(e) => setProductForm(prev => ({ ...prev, quantity_available: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Estoque Extra (Reserva)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productForm.quantity_extra}
                    onChange={(e) => setProductForm(prev => ({ ...prev, quantity_extra: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Telefone do Organizador (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (47) 99999-9999"
                    value={productForm.organizer_phone}
                    onChange={(e) => setProductForm(prev => ({ ...prev, organizer_phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-semibold"
                  />
                  <p className="text-[9px] text-stone-400 mt-1">Contato para onde o cliente enviará os comprovantes e pedidos de voucher extra por WhatsApp.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">Foto / Imagem do Produto</label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Cole uma URL ou faça upload abaixo"
                        value={productForm.image_url}
                        onChange={(e) => setProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm mb-2"
                      />
                    </div>
                    <div className="relative overflow-hidden cursor-pointer bg-stone-200 shrink-0 hover:bg-stone-300 transition-colors p-3.5 rounded-xl border border-stone-300 text-stone-700 flex items-center justify-center">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploadingImage}
                      />
                      <Upload size={16} />
                    </div>
                  </div>
                  {isUploadingImage && <span className="text-[10px] text-primary font-bold">Subindo foto...</span>}
                </div>
                </div>

              <div className="flex items-center gap-3">
                <label className="relative flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary h-4 w-4 border-stone-300"
                  />
                  <span className="text-xs font-bold text-stone-700">Visível / Disponível para venda pública</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200/50">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="px-5 py-2.5 rounded-xl text-stone-500 hover:text-stone-700 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                >
                  Salvar Produto
                </button>
              </div>
            </motion.form>
          )}

          {/* Product Cards Management */}
          {products.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100 text-center text-stone-400">
              Não há produtos no catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  {/* Miniature Cover with edit toggling */}
                  <div className="h-32 bg-stone-100 relative overflow-hidden">
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={p.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <Coffee size={24} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-stone-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-xs font-black">
                      {formatPrice(p.price)}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 text-base leading-snug">{p.title}</h4>
                      <p className="text-stone-500 text-xs line-clamp-2 mt-1">{p.description || 'Sem descrição'}</p>
                    </div>

                    <div className="border-t border-stone-150 pt-3 mt-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Estoque</span>
                        <span className={`font-black ${p.quantity_available <= 0 ? 'text-red-500' : 'text-stone-700'}`}>
                          {p.quantity_available} un.
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setProductForm({
                              id: p.id,
                              title: p.title,
                              description: p.description,
                              price: p.price,
                              image_url: p.image_url || '',
                              quantity_available: p.quantity_available,
                              organizer_phone: p.organizer_phone || '',
                              quantity_extra: p.quantity_extra || 0,
                              is_active: p.is_active
                            });
                            setIsEditingProduct(true);
                          }}
                          className="p-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg hover:text-stone-900"
                          title="Editar"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          className="p-2 bg-stone-50 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // ==========================================
        // ADMIN PANEL: VOUCHERS MANAGEMENT
        // ==========================================
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            {/* Search Input */}
            <input
              type="text"
              placeholder="🔍 Buscar por nome do comprador ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm flex-1 md:max-w-md font-medium"
            />

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {['all', 'pending', 'confirmed', 'rejected'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-4 py-2 flex-grow sm:flex-grow-0 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    filterStatus === st 
                      ? 'bg-stone-900 text-white border-stone-900' 
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st === 'pending' ? 'Pendentes' : st === 'confirmed' ? 'Homologados' : 'Recusados'}
                </button>
              ))}
            </div>
          </div>

          {/* Vouchers Table */}
          {filteredVouchers.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl p-12 text-center text-stone-400 border border-dashed border-stone-200">
              Não há vouchers cadastrados com o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block bg-white border border-stone-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-stone-50/50 border-b border-stone-100 text-stone-400 text-[10px] uppercase font-black tracking-wider">
                        <th className="py-4 px-6">ID / Data</th>
                        <th className="py-4 px-6">Comprador</th>
                        <th className="py-4 px-6">Item Comprado</th>
                        <th className="py-4 px-6 text-center">Quant.</th>
                        <th className="py-4 px-6 text-right">Valor Total</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredVouchers.map(v => {
                        const dateObj = v.created_at ? new Date(v.created_at) : new Date();
                        const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={v.id} className="hover:bg-stone-50/40 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-mono font-bold bg-stone-100 px-2 py-0.5 rounded text-stone-800 text-xs">
                                {v.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="block text-[10px] text-stone-400 mt-1 font-semibold">{dateStr}</span>
                            </td>
                            <td className="py-4 px-6">
                              <h5 className="font-black text-stone-900 leading-snug">{v.buyer_name}</h5>
                              <span className="text-xs text-stone-500 font-semibold">{v.buyer_phone}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-stone-800">{v.product_title}</span>
                              {/* Receipt Proof Badge in item field */}
                              {v.payment_proof_url && (
                                <a 
                                  href={v.payment_proof_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="block text-[11px] text-blue-600 hover:underline font-bold mt-1 flex items-center gap-1"
                                >
                                  <ExternalLink size={10} />
                                  Ver Comprovante
                                </a>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-stone-600">
                              {v.quantity} un.
                            </td>
                            <td className="py-4 px-6 text-right font-black text-stone-950">
                              {formatPrice(v.total_price)}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                                v.payment_status === 'confirmed' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : v.payment_status === 'rejected'
                                  ? 'bg-red-50 text-red-650 border-red-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                              }`}>
                                {v.payment_status === 'confirmed' ? 'Homologado' : v.payment_status === 'rejected' ? 'Cancelado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-y-1.5 md:space-y-0">
                              <div className="flex justify-end gap-1.5">
                                {v.payment_status !== 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateVoucherStatus(v, 'confirmed')}
                                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg"
                                    title="Homologar Pagamento"
                                  >
                                    <Check size={15} />
                                  </button>
                                )}

                                {v.payment_status !== 'rejected' && (
                                  <button
                                    onClick={() => handleUpdateVoucherStatus(v, 'rejected')}
                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-lg"
                                    title="Rejeitar Pagamento"
                                  >
                                    <X size={15} />
                                  </button>
                                )}

                                {v.payment_status === 'confirmed' && (
                                  <button
                                    onClick={() => handleShareVoucherWhatsApp(v)}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center"
                                    title="Enviar Comprovante por WhatsApp"
                                  >
                                    <MessageCircle size={15} />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteVoucher(v.id, v.buyer_name)}
                                  className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg"
                                  title="Excluir Registro"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block md:hidden space-y-4">
                {filteredVouchers.map(v => {
                  const dateObj = v.created_at ? new Date(v.created_at) : new Date();
                  const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={v.id} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                      {/* Code and status indicator */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-black bg-stone-100 text-stone-800 px-2 py-1 rounded">
                            #{v.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="block text-[10px] text-stone-400 mt-1 font-semibold">{dateStr}</span>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                          v.payment_status === 'confirmed' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : v.payment_status === 'rejected'
                            ? 'bg-red-50 text-red-650 border-red-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                        }`}>
                          {v.payment_status === 'confirmed' ? 'Homologado' : v.payment_status === 'rejected' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </div>

                      {/* Info lines */}
                      <div className="border-t border-b border-stone-100 py-3 space-y-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Comprador</span>
                          <h4 className="font-black text-stone-900 text-sm">{v.buyer_name}</h4>
                          <span className="text-xs text-stone-500 font-semibold">{v.buyer_phone}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Item Comprado</span>
                          <div className="flex justify-between items-center mt-0.5">
                            <div>
                              <span className="font-bold text-stone-800 text-sm">{v.product_title}</span>
                              <span className="text-stone-500 font-medium text-xs ml-1.5">({v.quantity} un.)</span>
                            </div>
                            <span className="font-black text-stone-950 text-sm">{formatPrice(v.total_price)}</span>
                          </div>
                        </div>
                        {v.payment_proof_url && (
                          <div className="pt-1.5">
                            <a 
                              href={v.payment_proof_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-bold"
                            >
                              <ExternalLink size={12} />
                              Ver Comprovante
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {v.payment_status !== 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateVoucherStatus(v, 'confirmed')}
                            className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 border border-emerald-100 transition-colors"
                          >
                            <Check size={14} />
                            Homologar
                          </button>
                        )}

                        {v.payment_status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateVoucherStatus(v, 'rejected')}
                            className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-650 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 border border-red-100 transition-colors"
                          >
                            <X size={14} />
                            Rejeitar
                          </button>
                        )}

                        {v.payment_status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleShareVoucherWhatsApp(v)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                          >
                            <MessageCircle size={14} />
                            Avisar WhatsApp
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(v.id, v.buyer_name)}
                          className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-xl transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
