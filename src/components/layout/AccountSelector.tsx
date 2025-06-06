
import React from 'react';
import { useAccount } from '@/context/AccountContext';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const AccountSelector: React.FC = () => {
  const { user } = useAuth();
  const { selectedAccountId, setSelectedAccountId, userAccounts, isLoading } = useAccount();

  if (!user || isLoading) {
    return null;
  }

  if (userAccounts.length === 0) {
    return null;
  }

  const handleAccountChange = (accountId: string) => {
    console.log("Account changed to:", accountId);
    setSelectedAccountId(accountId);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedAccountId || undefined} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar cuenta" />
        </SelectTrigger>
        <SelectContent>
          {user.role === 'superAdmin' && (
            <SelectItem value="all">Todas las cuentas</SelectItem>
          )}
          {userAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountSelector;
