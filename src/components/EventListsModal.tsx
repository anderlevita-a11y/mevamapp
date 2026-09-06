import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  Check, 
  Copy, 
  Upload, 
  Trash2, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Search, 
  AlertCircle, 
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ExternalLink, 
  X, 
  User, 
  DollarSign, 
  FileText, 
  Eye, 
  Database,
  ArrowLeft,
  Filter,
  CreditCard,
  QrCode
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface EventList {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  pix_key?: string;
  pix_type?: string;
  pix_recipient?: string;
  suggested_value?: number;
  creator_id?: string;
  creator_name: string;
  creator_email?: string;
  is_active: boolean;
  created_at?: string;
}

export interface EventListParticipant {
  id: string;
  list_id: string;
  name: string;
  phone?: string;
  user_id?: string;
  payment_proof_url?: string;
  payment_status: 'pending' | 'confirmed' | 'rejected';
  notes?: string;
  created_at?: string;
}

interface EventListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userRole?: string;
  onOpenMemberArea: () => void;
}

export const EventListsModal: React.FC<EventListsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userRole,
  onOpenMemberArea
}) => {
  const [lists, setLists] = useState<EventList[]>([]);
  const [selectedList, setSelectedList] = useState<EventList | null>(null);
  const [participants, setParticipants] = useState<EventListParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [listParticipantsLoading, setListParticipantsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'lists' | 'create' | 'detail'>('lists');
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [previewProof, setPreviewProof] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  // States for pastor-only list deletion confirmation modal
  const [listToDelete, setListToDelete] = useState<EventList | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [userDbRole, setUserDbRole] = useState<string | null>(null);

  // Form states for creating a new list
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListDate, setNewListDate] = useState('');
  const [newListPixKey, setNewListPixKey] = useState('');
  const [newListPixType, setNewListPixType] = useState('Aleatória');
  const [newListPixRecipient, setNewListPixRecipient] = useState('');
  const [newListSuggestedValue, setNewListSuggestedValue] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Form states for joining a list
  const [joinName, setJoinName] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinNotes, setJoinNotes] = useState('');
  const [joinProofFile, setJoinProofFile] = useState<File | null>(null);
  const [joinProofPreview, setJoinProofPreview] = useState<string | null>(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (currentUser) {
      const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
      setJoinName(name);

      // Check role in profiles table to be 100% sure of pastor/admin privileges
      if (currentUser.id) {
        const fetchProfileRole = async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUser.id)
              .single();
            if (data?.role) {
              setUserDbRole(data.role);
            }
          } catch (e) {
            // Silently ignore if profiles table is not yet set up
          }
        };
        fetchProfileRole();
      }
    } else {
      setUserDbRole(null);
    }
  }, [currentUser]);

  // Derived role and permissions
  const effectiveRole = (
    userDbRole || 
    userRole || 
    currentUser?.app_metadata?.role || 
    currentUser?.user_metadata?.role || 
    'member'
  ).toLowerCase();

  const isPastor = !!currentUser && (
    effectiveRole === 'pastor' ||
    effectiveRole === 'admin' ||
    effectiveRole === 'secretaria' ||
    currentUser?.email === 'anderlevita@gmail.com'
  );

  // Load lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists();
    } else {
      setSelectedList(null);
      setActiveTab('lists');
      setShowJoinForm(false);
      setPreviewProof(null);
    }
  }, [isOpen]);

  // Load participants when a list is selected
  useEffect(() => {
    if (selectedList) {
      fetchParticipants(selectedList.id);
      setActiveTab('detail');
    }
  }, [selectedList]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_lists')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.warn('Supabase error loading lists, using local fallback:', error.message);
        loadLocalLists();
      } else if (data) {
        setLists(data);
        setUsingLocalStorage(false);
      }
    } catch (err: any) {
      console.warn('Network or schema exception, using local storage fallback:', err);
      loadLocalLists();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalLists = () => {
    setUsingLocalStorage(true);
    const saved = localStorage.getItem('mevam_event_lists');
    if (saved) {
      try {
        setLists(JSON.parse(saved));
      } catch {
        setLists(getSampleLists());
      }
    } else {
      const samples = getSampleLists();
      localStorage.setItem('mevam_event_lists', JSON.stringify(samples));
      setLists(samples);
    }
  };

  const getSampleLists = (): EventList[] => [
    {
      id: 'demo-list-1',
      title: 'Almoço de Comunhão da Célula',
      description: 'Churrasco comunitário no sítio. Traga sua alegria e sua família!',
      event_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      pix_key: 'mevam.itapema@igreja.com.br',
      pix_type: 'Chave Email',
      pix_recipient: 'MEVAM Itapema Sertão',
      suggested_value: 35,
      creator_name: 'Pr. Responsável',
      creator_email: 'contato@mevam.org.br',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-list-2',
      title: 'Camiseta do Congresso Geral 2026',
      description: 'Encomenda das camisetas oficiais. Por favor, coloque seu tamanho na observação e anexe o comprovante.',
      event_date: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 16),
      pix_key: '47999887766',
      pix_type: 'Telefone',
      pix_recipient: 'Tesouraria Mevam',
      suggested_value: 45,
      creator_name: 'Liderança de Eventos',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  const fetchParticipants = async (listId: string) => {
    setListParticipantsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_list_participants')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase error loading participants, using local storage:', error.message);
        loadLocalParticipants(listId);
      } else if (data) {
        setParticipants(data);
      }
    } catch {
      loadLocalParticipants(listId);
    } finally {
      setListParticipantsLoading(false);
    }
  };

  const loadLocalParticipants = (listId: string) => {
    const saved = localStorage.getItem(`mevam_participants_${listId}`);
    if (saved) {
      try {
        setParticipants(JSON.parse(saved));
      } catch {
        setParticipants([]);
      }
    } else {
      const initial: EventListParticipant[] = [
        {
          id: 'p-1',
          list_id: listId,
          name: 'Gabriel Silva',
          phone: '(47) 99876-5432',
          payment_status: 'confirmed',
          notes: 'Confirmado - 1 pessoa',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ];
      localStorage.setItem(`mevam_participants_${listId}`, JSON.stringify(initial));
      setParticipants(initial);
    }
  };

  // Upload proof with robust fallback
  const uploadProofFile = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `event-proofs/${fileName}`;

      const { error } = await supabase.storage
        .from('event-proofs')
        .upload(filePath, file, { upsert: true });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('event-proofs')
          .getPublicUrl(filePath);
        return publicUrl;
      }
    } catch (err) {
      console.warn('Storage bucket upload failed, using inline Data URL fallback', err);
    }

    // High fidelity base64 Data URL fallback guarantees file is preserved even before storage bucket setup
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenMemberArea();
      return;
    }

    if (!newListTitle.trim() || !newListDate) {
      alert('Por favor, informe o nome do evento e a data.');
      return;
    }

    setCreateSubmitting(true);
    const creatorName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Membro MEVAM';
    const newList: EventList = {
      id: crypto.randomUUID ? crypto.randomUUID() : `list-${Date.now()}`,
      title: newListTitle.trim(),
      description: newListDescription.trim() || undefined,
      event_date: new Date(newListDate).toISOString(),
      pix_key: newListPixKey.trim() || undefined,
      pix_type: newListPixKey.trim() ? newListPixType : undefined,
      pix_recipient: newListPixRecipient.trim() || undefined,
      suggested_value: newListSuggestedValue ? parseFloat(newListSuggestedValue.replace(',', '.')) : undefined,
      creator_id: currentUser.id,
      creator_name: creatorName,
      creator_email: currentUser.email,
      is_active: true,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('event_lists')
        .insert([newList])
        .select()
        .single();

      if (!error && data) {
        setLists(prev => [data, ...prev]);
        setSelectedList(data);
      } else {
        // Fallback local persistence
        const updated = [newList, ...lists];
        localStorage.setItem('mevam_event_lists', JSON.stringify(updated));
        setLists(updated);
        setSelectedList(newList);
      }

      // Reset form
      setNewListTitle('');
      setNewListDescription('');
      setNewListDate('');
      setNewListPixKey('');
      setNewListPixRecipient('');
      setNewListSuggestedValue('');
      setActiveTab('detail');
    } catch (err) {
      console.warn('Save error, saving locally:', err);
      const updated = [newList, ...lists];
      localStorage.setItem('mevam_event_lists', JSON.stringify(updated));
      setLists(updated);
      setSelectedList(newList);
      setActiveTab('detail');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList) return;
    if (!joinName.trim()) {
      alert('Por favor, informe o seu nome para entrar na lista.');
      return;
    }

    setJoinSubmitting(true);
    try {
      let proofUrl: string | undefined = undefined;
      if (joinProofFile) {
        proofUrl = await uploadProofFile(joinProofFile);
      }

      const newParticipant: EventListParticipant = {
        id: crypto.randomUUID ? crypto.randomUUID() : `part-${Date.now()}`,
        list_id: selectedList.id,
        name: joinName.trim(),
        phone: joinPhone.trim() || undefined,
        user_id: currentUser?.id || undefined,
        payment_proof_url: proofUrl,
        payment_status: proofUrl ? 'pending' : 'pending',
        notes: joinNotes.trim() || undefined,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('event_list_participants')
        .insert([newParticipant])
        .select()
        .single();

      const created = (!error && data) ? data : newParticipant;
      const updated = [...participants, created];
      setParticipants(updated);
      localStorage.setItem(`mevam_participants_${selectedList.id}`, JSON.stringify(updated));

      // Reset join form
      setJoinNotes('');
      setJoinProofFile(null);
      setJoinProofPreview(null);
      setShowJoinForm(false);
      alert('Nome incluído com sucesso na lista!');
    } catch (err: any) {
      alert('Erro ao incluir nome: ' + (err.message || 'Tente novamente'));
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleStatusChange = async (participantId: string, newStatus: 'pending' | 'confirmed' | 'rejected') => {
    if (!selectedList) return;
    const isCreator = currentUser && (currentUser.id === selectedList.creator_id || isPastor);
    if (!isCreator) {
      alert('Apenas o criador da lista ou a liderança pastoral pode alterar o status do pagamento.');
      return;
    }

    try {
      await supabase
        .from('event_list_participants')
        .update({ payment_status: newStatus })
        .eq('id', participantId);
    } catch (err) {
      console.warn('Update online failed, saving locally', err);
    }

    const updated = participants.map(p => p.id === participantId ? { ...p, payment_status: newStatus } : p);
    setParticipants(updated);
    localStorage.setItem(`mevam_participants_${selectedList.id}`, JSON.stringify(updated));
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!selectedList) return;
    const canManage = currentUser && (selectedList.creator_id === currentUser.id || isPastor);
    if (!canManage) {
      alert('Apenas o criador da lista ou a pastoral pode remover inscrições.');
      return;
    }

    if (!confirm('Deseja remover este nome da lista?')) return;

    try {
      await supabase
        .from('event_list_participants')
        .delete()
        .eq('id', participantId);
    } catch (err) {
      console.warn('Delete online failed, updating locally', err);
    }

    const updated = participants.filter(p => p.id !== participantId);
    setParticipants(updated);
    localStorage.setItem(`mevam_participants_${selectedList.id}`, JSON.stringify(updated));
  };

  // Opens the safety confirmation screen - strictly pastor only
  const handleRequestDeleteList = (list: EventList, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!isPastor) {
      alert('Acesso Restrito: Somente pastores ou administradores logados têm permissão para excluir listas de eventos.');
      return;
    }
    setListToDelete(list);
  };

  // Executes list deletion after confirmation on the modal
  const handleConfirmDeleteList = async () => {
    if (!listToDelete) return;
    if (!isPastor) {
      alert('Acesso Restrito: Apenas pastores logados podem excluir listas.');
      setListToDelete(null);
      return;
    }

    setIsDeletingList(true);
    const listId = listToDelete.id;

    try {
      await supabase
        .from('event_lists')
        .delete()
        .eq('id', listId);
    } catch (err) {
      console.warn('Delete list error on Supabase:', err);
    }

    const updated = lists.filter(l => l.id !== listId);
    setLists(updated);
    localStorage.setItem('mevam_event_lists', JSON.stringify(updated));
    localStorage.removeItem(`mevam_participants_${listId}`);

    if (selectedList?.id === listId) {
      setSelectedList(null);
      setActiveTab('lists');
    }

    setIsDeletingList(false);
    setListToDelete(null);
  };

  const handleCopyPix = (pixKey: string) => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!selectedList) return;
    const dateFormatted = new Date(selectedList.event_date).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    let text = `📋 *LISTA DE EVENTO - MEVAM ITAPEMA SERTÃO*\n`;
    text += `*Evento:* ${selectedList.title}\n`;
    text += `*Data:* ${dateFormatted}\n`;
    if (selectedList.suggested_value) {
      text += `*Valor:* R$ ${selectedList.suggested_value.toFixed(2).replace('.', ',')}\n`;
    }
    if (selectedList.pix_key) {
      text += `*Chave PIX:* ${selectedList.pix_key} (${selectedList.pix_type || 'PIX'})\n`;
      if (selectedList.pix_recipient) text += `*Titular:* ${selectedList.pix_recipient}\n`;
    }
    text += `\n*Inscritos (${participants.length}):*\n`;

    participants.forEach((p, index) => {
      const statusIcon = p.payment_status === 'confirmed' ? '✅ Pago' : p.payment_proof_url ? '📄 Comprovante enviado' : '⏳ Pendente';
      text += `${index + 1}. ${p.name} - ${statusIcon}\n`;
    });

    text += `\nPara adicionar seu nome e comprovante, acesse o app da igreja: ${window.location.origin}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopySql = () => {
    const sqlCode = `-- SQL para Supabase Dashboard (SQL Editor)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS event_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pix_key TEXT,
  pix_type TEXT,
  pix_recipient TEXT,
  suggested_value NUMERIC(10, 2),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_list_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES event_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_lists_active ON event_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_event_list_participants_list ON event_list_participants(list_id);

ALTER TABLE event_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_list_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active event lists" ON event_lists;
CREATE POLICY "Public can view active event lists" ON event_lists FOR SELECT USING (is_active = true OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Authenticated members can create event lists" ON event_lists;
CREATE POLICY "Authenticated members can create event lists" ON event_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Creators can update their own event lists" ON event_lists;
CREATE POLICY "Creators can update their own event lists" ON event_lists FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their own event lists" ON event_lists;
DROP POLICY IF EXISTS "Only pastors can delete event lists" ON event_lists;
CREATE POLICY "Only pastors can delete event lists" ON event_lists FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('pastor', 'admin'))
  OR (auth.jwt() ->> 'email') = 'anderlevita@gmail.com'
);

DROP POLICY IF EXISTS "Public can view list participants" ON event_list_participants;
CREATE POLICY "Public can view list participants" ON event_list_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can join event list" ON event_list_participants;
CREATE POLICY "Anyone can join event list" ON event_list_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Creators and participants can update registration" ON event_list_participants;
CREATE POLICY "Creators and participants can update registration" ON event_list_participants FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM event_lists WHERE event_lists.id = event_list_participants.list_id AND event_lists.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Creators and participants can delete registration" ON event_list_participants;
CREATE POLICY "Creators and participants can delete registration" ON event_list_participants FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM event_lists WHERE event_lists.id = event_list_participants.list_id AND event_lists.creator_id = auth.uid())
);

INSERT INTO storage.buckets (id, name, public) VALUES ('event-proofs', 'event-proofs', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public view on event proofs" ON storage.objects;
CREATE POLICY "Public view on event proofs" ON storage.objects FOR SELECT USING (bucket_id = 'event-proofs');
DROP POLICY IF EXISTS "Anyone can upload event proofs" ON storage.objects;
CREATE POLICY "Anyone can upload event proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-proofs');`;

    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered lists for search
  const filteredLists = lists.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    l.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered participants for payment status
  const filteredParticipants = participants.filter(p => {
    if (filterPayment === 'confirmed') return p.payment_status === 'confirmed';
    if (filterPayment === 'pending') return p.payment_status === 'pending';
    return true;
  });

  const isSelectedListCreator = selectedList && currentUser && (
    selectedList.creator_id === currentUser.id || 
    currentUser.email === 'anderlevita@gmail.com'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-stone-200 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-stone-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center space-x-3">
            {activeTab !== 'lists' && (
              <button
                onClick={() => {
                  if (activeTab === 'create' || activeTab === 'detail') {
                    setActiveTab('lists');
                    setSelectedList(null);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-tight">
                {activeTab === 'create' ? 'Criar Nova Lista' : activeTab === 'detail' && selectedList ? selectedList.title : 'Listas de Eventos & Comprovantes'}
              </h3>
              <p className="text-xs text-stone-500">
                {activeTab === 'create' ? 'Disponível para qualquer membro cadastrado' : activeTab === 'detail' ? 'Confirmação de presença e pagamentos via PIX' : 'Inscrições, arrecadações e confirmações'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SQL & RLS Quick Drawer Modal */}
        {showSqlGuide && (
          <div className="bg-amber-50/70 border-b border-amber-200 p-4 text-xs text-stone-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[11px]">
                  Script Supabase
                </span>
                <span className="font-semibold text-stone-900">Tabelas & Políticas RLS Prontas</span>
              </div>
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-md flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL Completo'}</span>
              </button>
            </div>
            <p className="text-stone-600 mb-2">
              Basta colar no <strong>SQL Editor</strong> do seu painel Supabase e clicar em <strong>Run</strong>. Inclui tabelas <code className="text-amber-800 font-semibold">event_lists</code>, <code className="text-amber-800 font-semibold">event_list_participants</code>, RLS para membros e bucket para comprovantes.
            </p>
            <pre className="max-h-32 overflow-y-auto bg-white p-2.5 rounded border border-stone-200 text-[11px] font-mono text-stone-800 whitespace-pre-wrap">
              {`-- Copie este SQL e execute no Supabase Dashboard
CREATE TABLE IF NOT EXISTS event_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pix_key TEXT,
  creator_id UUID REFERENCES auth.users(id)
);
-- Veja o arquivo /src/event_lists_schema.sql para o script completo com todas as RLS!`}
            </pre>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: LISTS OVERVIEW */}
          {activeTab === 'lists' && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar lista pelo nome do evento..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      onOpenMemberArea();
                    } else {
                      setActiveTab('create');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95 transition cursor-pointer"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Criar Nova Lista</span>
                </button>
              </div>

              {/* Not Logged In Notice Banner */}
              {!currentUser && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-amber-900">
                    <User size={16} className="text-amber-600 flex-shrink-0" />
                    <span>Qualquer pessoa pode se inscrever nas listas. Para <strong>criar uma lista</strong>, você precisa estar cadastrado como membro.</span>
                  </div>
                  <button
                    onClick={onOpenMemberArea}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex-shrink-0 cursor-pointer"
                  >
                    Entrar / Cadastrar
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-12 text-center text-stone-500 text-sm">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <span>Carregando listas ativas...</span>
                </div>
              )}

              {/* Lists Cards Grid */}
              {!loading && filteredLists.length === 0 && (
                <div className="py-16 text-center text-stone-500 bg-stone-50/60 border border-stone-200 rounded-2xl p-6">
                  <ClipboardList size={36} className="text-stone-400 mx-auto mb-3" />
                  <h4 className="font-bold text-stone-900 text-base mb-1">Nenhuma lista encontrada</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
                    {searchTerm ? 'Nenhuma lista corresponde ao termo pesquisado.' : 'Ainda não há listas criadas no momento. Seja o primeiro membro a criar uma!'}
                  </p>
                  <button
                    onClick={() => {
                      if (!currentUser) onOpenMemberArea();
                      else setActiveTab('create');
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>Criar Primeira Lista</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLists.map((item) => {
                  const eventDate = new Date(item.event_date);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedList(item)}
                      className="group relative bg-white hover:bg-stone-50/80 border border-stone-200 hover:border-amber-400/80 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Calendar size={12} />
                            {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {item.pix_key && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <DollarSign size={11} />
                              PIX
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-stone-900 text-base group-hover:text-amber-600 transition-colors mb-1.5">
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className="text-xs text-stone-600 line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-stone-400" />
                          <span className="truncate max-w-[130px] font-medium text-stone-700">{item.creator_name}</span>
                        </div>

                        {item.suggested_value && (
                          <span className="font-bold text-amber-700">
                            R$ {item.suggested_value.toFixed(2).replace('.', ',')}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {isPastor && (
                            <button
                              type="button"
                              onClick={(e) => handleRequestDeleteList(item, e)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Excluir lista (Exclusivo Pastoral)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                            Ver lista &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE LIST FORM (Registered Members Only) */}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              {!currentUser ? (
                <div className="text-center py-12">
                  <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-stone-900 mb-2">Apenas Membros Cadastrados</h3>
                  <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">
                    Para criar uma nova lista para eventos, retiros, almoços ou camisetas, faça login na sua conta de membro.
                  </p>
                  <button
                    onClick={onOpenMemberArea}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm cursor-pointer shadow-sm"
                  >
                    Fazer Login / Cadastrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateList} className="space-y-5 bg-stone-50/70 border border-stone-200 rounded-2xl p-5 sm:p-7 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Passo 1 de 2</span>
                    <h3 className="text-lg font-bold text-stone-900">Dados do Evento</h3>
                    <p className="text-xs text-stone-500">Criando como: <strong className="text-stone-800">{currentUser.user_metadata?.full_name || currentUser.email}</strong></p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nome do Evento / Finalidade da Lista <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      placeholder="Ex: Almoço da Célula, Retiro, Futebol, Camiseta..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Data e Hora do Evento <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={newListDate}
                        onChange={(e) => setNewListDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Valor Sugerido por Pessoa (R$) <span className="text-stone-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newListSuggestedValue}
                        onChange={(e) => setNewListSuggestedValue(e.target.value)}
                        placeholder="Ex: 35,00"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Descrição / Orientações <span className="text-stone-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="Ex: Levar prato doce ou salgado, trazer toalha, especificar tamanho da camiseta na observação..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="pt-3 border-t border-stone-200 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Passo 2 de 2</span>
                      <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                        <CreditCard size={16} className="text-amber-600" />
                        Chave PIX para Arrecadação <span className="text-stone-400 font-normal text-xs">(opcional)</span>
                      </h4>
                      <p className="text-xs text-stone-500">
                        Caso os participantes precisem realizar o pagamento e enviar comprovante.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Tipo de Chave
                        </label>
                        <select
                          value={newListPixType}
                          onChange={(e) => setNewListPixType(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                        >
                          <option value="Aleatória">Aleatória</option>
                          <option value="CPF/CNPJ">CPF / CNPJ</option>
                          <option value="Email">E-mail</option>
                          <option value="Telefone">Telefone / Celular</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Chave PIX
                        </label>
                        <input
                          type="text"
                          value={newListPixKey}
                          onChange={(e) => setNewListPixKey(e.target.value)}
                          placeholder="Informe a chave PIX..."
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 font-mono text-xs shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Nome do Titular do PIX / Banco <span className="text-stone-400 font-normal">(para conferência segura)</span>
                      </label>
                      <input
                        type="text"
                        value={newListPixRecipient}
                        onChange={(e) => setNewListPixRecipient(e.target.value)}
                        placeholder="Ex: João da Silva / Banco Inter"
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setActiveTab('lists')}
                      className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={createSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {createSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          <span>Publicar Lista</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: LIST DETAILS & PARTICIPANTS */}
          {activeTab === 'detail' && selectedList && (
            <div className="space-y-6">
              {/* Event Header Banner */}
              <div className="bg-stone-50/70 border border-stone-200 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(selectedList.event_date).toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          day: '2-digit', 
                          month: 'long',
                          year: 'numeric' 
                        })} às {new Date(selectedList.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {selectedList.suggested_value && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          R$ {selectedList.suggested_value.toFixed(2).replace('.', ',')} por pessoa
                        </span>
                      )}

                      {isPastor && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                          <ShieldCheck size={13} />
                          Liderança Pastoral
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">
                      {selectedList.title}
                    </h2>

                    {selectedList.description && (
                      <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed mb-3">
                        {selectedList.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>Criado por: <strong className="text-stone-800">{selectedList.creator_name}</strong></span>
                      <span>Total de Inscritos: <strong className="text-amber-600">{participants.length}</strong></span>
                    </div>
                  </div>

                  {/* Actions (Share / Delete) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
                      title="Compartilhar lista no WhatsApp"
                    >
                      <Share2 size={15} />
                      <span>WhatsApp</span>
                    </button>

                    {/* Exclusão permitida estritamente para Pastores Logados */}
                    {isPastor && (
                      <button
                        type="button"
                        onClick={(e) => handleRequestDeleteList(selectedList, e)}
                        className="px-3.5 py-2 text-red-700 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl transition cursor-pointer border border-red-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                        title="Excluir esta lista de evento (Acesso Pastoral)"
                      >
                        <Trash2 size={15} />
                        <span>Excluir Lista</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PIX Details Box (if key exists) */}
                {selectedList.pix_key && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-amber-600" />
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                          Chave PIX para Pagamento ({selectedList.pix_type || 'PIX'})
                        </span>
                      </div>
                      <div className="font-mono text-sm sm:text-base font-bold text-stone-900 tracking-wide select-all break-all bg-white px-3 py-1.5 rounded-lg border border-amber-200 inline-block">
                        {selectedList.pix_key}
                      </div>
                      {selectedList.pix_recipient && (
                        <p className="text-[11px] text-amber-900/80">
                          Titular: {selectedList.pix_recipient}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyPix(selectedList.pix_key!)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer flex-shrink-0 shadow-sm"
                    >
                      {copiedPix ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copiedPix ? 'Chave Copiada!' : 'Copiar Chave PIX'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Join / Include Name Button or Form */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm">
                {!showJoinForm ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-stone-900 text-base">Quer participar deste evento?</h4>
                      <p className="text-xs text-stone-500">
                        Inclua seu nome abaixo e anexe seu comprovante de pagamento para confirmar presença.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowJoinForm(true)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                      <span>Incluir Meu Nome na Lista</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleJoinList} className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <User size={16} className="text-amber-600" />
                        Incluir Nome & Enviar Comprovante
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowJoinForm(false)}
                        className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Seu Nome Completo <span className="text-amber-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          placeholder="Digite seu nome..."
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          WhatsApp / Telefone <span className="text-stone-400 font-normal">(opcional)</span>
                        </label>
                        <input
                          type="tel"
                          value={joinPhone}
                          onChange={(e) => setJoinPhone(e.target.value)}
                          placeholder="(47) 99999-9999"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Observação / Detalhes <span className="text-stone-400 font-normal">(ex: "2 pessoas", "tamanho G", etc.)</span>
                      </label>
                      <input
                        type="text"
                        value={joinNotes}
                        onChange={(e) => setJoinNotes(e.target.value)}
                        placeholder="Informações adicionais..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>

                    {/* File Upload for Payment Proof */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Comprovante de Pagamento PIX <span className="text-stone-400 font-normal">(foto ou PDF)</span>
                      </label>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setJoinProofFile(file);
                              if (file.type.startsWith('image/')) {
                                setJoinProofPreview(URL.createObjectURL(file));
                              } else {
                                setJoinProofPreview(null);
                              }
                            }
                          }}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-dashed border-stone-300 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <Upload size={16} className="text-amber-600" />
                          <span>{joinProofFile ? 'Trocar Arquivo' : 'Selecionar Comprovante'}</span>
                        </button>

                        {joinProofFile && (
                          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                            <CheckCircle2 size={15} className="text-emerald-600" />
                            <span className="truncate max-w-[200px] font-medium">{joinProofFile.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setJoinProofFile(null);
                                setJoinProofPreview(null);
                              }}
                              className="text-stone-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {joinProofPreview && (
                        <div className="mt-2.5 relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-white p-1">
                          <img src={joinProofPreview} alt="Preview" className="w-full h-full object-cover rounded" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => setShowJoinForm(false)}
                        className="px-4 py-2 text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={joinSubmitting}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {joinSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                            <span>Gravando...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Confirmar Presença</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Participants List Table / Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                      <span>Inscritos na Lista</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {participants.length}
                      </span>
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <button
                      onClick={() => setFilterPayment('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${filterPayment === 'all' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`}
                    >
                      Todos ({participants.length})
                    </button>
                    <button
                      onClick={() => setFilterPayment('confirmed')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${filterPayment === 'confirmed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`}
                    >
                      Pagos ({participants.filter(p => p.payment_status === 'confirmed').length})
                    </button>
                    <button
                      onClick={() => setFilterPayment('pending')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${filterPayment === 'pending' ? 'bg-amber-400 text-stone-950 font-bold shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`}
                    >
                      Pendentes ({participants.filter(p => p.payment_status === 'pending').length})
                    </button>
                  </div>
                </div>

                {/* List of Persons */}
                {listParticipantsLoading ? (
                  <div className="py-8 text-center text-stone-500 text-sm">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Carregando inscritos...</span>
                  </div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="py-10 text-center text-stone-500 bg-stone-50 border border-stone-200 rounded-2xl">
                    <User size={30} className="text-stone-400 mx-auto mb-2" />
                    <p className="text-xs">Nenhum participante inscrito com esse filtro.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 shadow-sm">
                    {filteredParticipants.map((p, index) => {
                      const isConfirmed = p.payment_status === 'confirmed';
                      const hasProof = !!p.payment_proof_url;

                      return (
                        <div key={p.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-700 flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-stone-900 text-sm">{p.name}</span>
                                {p.phone && (
                                  <span className="text-[11px] text-stone-500">({p.phone})</span>
                                )}
                              </div>
                              {p.notes && (
                                <p className="text-xs text-stone-500 mt-0.5">
                                  Obs: <span className="text-stone-700">{p.notes}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                            {/* Proof Button */}
                            {hasProof ? (
                              <button
                                onClick={() => setPreviewProof(p.payment_proof_url!)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 cursor-pointer font-medium shadow-2xs"
                                title="Visualizar comprovante"
                              >
                                <Eye size={13} className="text-amber-600" />
                                <span>Ver Comprovante</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic">Sem comprovante</span>
                            )}

                            {/* Status Badge & Toggle */}
                            {isSelectedListCreator ? (
                              <button
                                onClick={() => handleStatusChange(p.id, isConfirmed ? 'pending' : 'confirmed')}
                                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                                  isConfirmed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                }`}
                                title="Clique para alterar status"
                              >
                                {isConfirmed ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Clock size={13} className="text-amber-600" />}
                                <span>{isConfirmed ? 'Confirmado' : 'Pendente'}</span>
                              </button>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                  isConfirmed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {isConfirmed ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-amber-600" />}
                                <span>{isConfirmed ? 'Confirmado' : 'Pendente'}</span>
                              </span>
                            )}

                            {/* Delete Participant (creator or own) */}
                            {(isSelectedListCreator || (currentUser && currentUser.id === p.user_id)) && (
                              <button
                                onClick={() => handleDeleteParticipant(p.id)}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Remover da lista"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>MEVAM Itapema Sertão • Módulo de Listas</span>
          </div>

          {activeTab !== 'lists' && (
            <button
              onClick={() => {
                setActiveTab('lists');
                setSelectedList(null);
              }}
              className="text-amber-600 hover:underline font-semibold cursor-pointer"
            >
              &larr; Voltar para todas as listas
            </button>
          )}
        </div>
      </motion.div>

      {/* Proof Preview Lightbox Modal */}
      {previewProof && (
        <div className="fixed inset-0 z-[120] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white border border-stone-200 rounded-2xl overflow-hidden p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <span className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <FileText size={16} className="text-amber-600" />
                Comprovante de Pagamento
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewProof}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs flex items-center gap-1 font-medium transition"
                >
                  <ExternalLink size={12} />
                  <span>Abrir Original</span>
                </a>
                <button
                  onClick={() => setPreviewProof(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-stone-100 rounded-xl p-2 border border-stone-200">
              {previewProof.startsWith('data:application/pdf') || previewProof.endsWith('.pdf') ? (
                <iframe src={previewProof} className="w-full h-[60vh] rounded" title="Comprovante PDF" />
              ) : (
                <img src={previewProof} alt="Comprovante de Pagamento" className="max-h-[70vh] object-contain rounded shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Prevent Accidental List Deletion */}
      <AnimatePresence>
        {listToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white border border-red-200 rounded-2xl shadow-2xl p-5 sm:p-6 text-stone-900 overflow-hidden"
            >
              {/* Linha de alerta decorativa */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-0.5">
                    Permissão Pastoral Exclusiva
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                    Confirmar Exclusão de Lista
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={isDeletingList}
                  onClick={() => setListToDelete(null)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer disabled:opacity-50"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Informações da lista a ser excluída */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-4">
                <span className="text-[11px] text-stone-500 block mb-1">Evento a ser removido:</span>
                <p className="text-sm sm:text-base font-bold text-stone-900 mb-2 leading-snug">
                  {listToDelete.title}
                </p>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <Calendar size={13} />
                    {new Date(listToDelete.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-stone-600">
                    <User size={13} />
                    Criado por: {listToDelete.creator_name}
                  </span>
                </div>
              </div>

              {/* Aviso de ação definitiva */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 leading-relaxed mb-6">
                <div className="flex items-center gap-1.5 font-bold text-red-700 mb-1">
                  <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                  <span>Atenção: Ação Irreversível</span>
                </div>
                Esta lista de evento será excluída definitivamente junto com todas as pessoas inscritas e todos os comprovantes enviados. Para evitar cliques acidentais, confirme sua decisão abaixo.
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeletingList}
                  onClick={() => setListToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingList}
                  onClick={handleConfirmDeleteList}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {isDeletingList ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Sim, Excluir Lista</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
