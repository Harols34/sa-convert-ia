
import React from 'react';
import { useAccount } from '@/context/AccountContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const AccountFilter: React.FC = () => {
  const { userAccounts, selectedAccountId, setSelectedAccountId, isLoading } = useAccount();

  if (isLoading) {
    return (
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            Filtro de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-9 bg-gray-200 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (userAccounts.length === 0) {
    return (
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            Filtro de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">No tienes cuentas asignadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center">
          <Building2 className="h-4 w-4 mr-2" />
          Filtro de Cuenta
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Select
          value={selectedAccountId || ''}
          onValueChange={(value) => setSelectedAccountId(value || null)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las cuentas</SelectItem>
            {userAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default AccountFilter;
