export type ClientStatus = 'Draft' | 'Active' | 'Blocked' | 'Completed' | 'On Hold';

export type ClientRecord = {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  browser: string;
  filedDate: string;
  attachment: { url: string; name: string; mimeType: string } | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientFormValues = Omit<ClientRecord, 'id' | 'attachment' | 'status' | 'createdAt' | 'updatedAt'>;

export const clientFile = (filedDate: string) => {
  const [year, month, day] = filedDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : filedDate;
};
