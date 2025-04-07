// src/lib/clientUtils.ts
import { fetchWithAuth } from "@/lib/api";

export interface Client {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  isDeleted?: boolean;
}

export interface ClientFormData {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

// Validasi data klien
export const validateClientData = (data: ClientFormData) => {
  const errors: Record<string, string> = {};

  if (!data.code) {
    errors.code = "Kode klien wajib diisi";
  } else if (data.code.length < 3) {
    errors.code = "Kode klien minimal 3 karakter";
  }

  if (!data.name) {
    errors.name = "Nama klien wajib diisi";
  }

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Format email tidak valid";
  }

  if (data.phone && !/^[0-9+\-\s()]{6,20}$/.test(data.phone)) {
    errors.phone = "Format nomor telepon tidak valid";
  }

  return errors;
};

// Cek apakah kode klien sudah ada
export const checkClientCodeExists = async (code: string): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`/api/clients/check-code?code=${encodeURIComponent(code)}`);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Error checking client code:", error);
    return false;
  }
};

// Cari klien berdasarkan nama atau email
export const searchClients = async (query: string): Promise<Client[]> => {
  try {
    const response = await fetchWithAuth(`/api/clients/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.clients || [];
  } catch (error) {
    console.error("Error searching clients:", error);
    return [];
  }
};

// Buat klien baru
export const createClient = async (data: ClientFormData, userId?: string): Promise<Client | null> => {
  try {
    const response = await fetchWithAuth("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        createdById: userId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Gagal membuat klien");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating client:", error);
    throw error;
  }
};

// Dapatkan data klien dari transaksi
export const getClientDataFromTransaction = (transaction: any): {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
} => {
  if (transaction.client) {
    return {
      clientId: transaction.client.id,
      clientName: transaction.client.name,
      clientEmail: transaction.client.email || "",
      clientPhone: transaction.client.phone || "",
    };
  }
  
  return {
    clientId: null,
    clientName: transaction.name || "",
    clientEmail: transaction.email || "",
    clientPhone: transaction.phone || "",
  };
};

// Format data klien untuk tampilan
export const formatClientDisplay = (client: Client): string => {
  return `${client.name} (${client.code})`;
};
