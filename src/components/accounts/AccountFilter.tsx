
import React from 'react';
import { useAccount } from '@/context/AccountContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';

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
          <div className="h-9 bg-gray-200 animate-pulse rounded flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userAccounts.length === 0) {
    return (
      <Card className="mx-4 mb-4 border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-amber-700">
            <Building2 className="h-4 w-4 mr-2" />
            Estado de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-amber-600">
            No tienes cuentas asignadas. Contacta al administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determinar valor actual correctamente
  const currentValue = React.useMemo(() => {
    if (userAccounts.length === 1) {
      return userAccounts[0].id;
    }
    return selectedAccountId || 'all';
  }, [selectedAccountId, userAccounts]);

  const handleValueChange = (value: string) => {
    console.log("Changing account filter to:", value);
    setSelectedAccountId(value === 'all' ? null : value);
  };

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
          value={currentValue}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent>
            {userAccounts.length > 1 && (
              <SelectItem value="all">Todas las cuentas</SelectItem>
            )}
            {userAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-muted-foreground">
          {userAccounts.length === 1 
            ? `Cuenta única: ${userAccounts[0].name}`
            : `${userAccounts.length} cuentas disponibles`
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountFilter;
