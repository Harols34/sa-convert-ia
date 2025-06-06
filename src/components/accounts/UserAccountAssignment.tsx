
import React, { useState, useEffect } from 'react';
import { useAccount } from '@/context/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, UserMinus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateHaroldUser from './CreateHaroldUser';
import type { User, Account } from '@/lib/types';

interface UserWithAccounts extends User {
  userAccounts: Account[];
}

const UserAccountAssignment: React.FC = () => {
  const { allAccounts, assignUserToAccount, removeUserFromAccount, getUserAccounts } = useAccount();
  const [users, setUsers] = useState<UserWithAccounts[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithAccounts[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Obtener usuarios desde auth.users via edge function o desde profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;

      // Cargar las cuentas de cada usuario
      const usersWithAccounts: UserWithAccounts[] = [];
      
      for (const profile of profiles || []) {
        const userAccounts = await getUserAccounts(profile.id);
        usersWithAccounts.push({
          id: profile.id,
          email: '', // Se cargará desde auth.users si es necesario
          full_name: profile.full_name,
          role: profile.role as any,
          avatar_url: profile.avatar_url,
          language: (profile.language === 'es' || profile.language === 'en') ? profile.language : 'es',
          dailyQueryLimit: 0,
          queriesUsed: 0,
          userAccounts
        });
      }

      setUsers(usersWithAccounts);
      setFilteredUsers(usersWithAccounts);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar usuarios
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  // Asignar usuario a cuenta
  const handleAssignUser = async () => {
    if (!selectedUserId || !selectedAccountId) {
      toast.error('Selecciona un usuario y una cuenta');
      return;
    }

    setIsAssigning(true);
    const success = await assignUserToAccount(selectedUserId, selectedAccountId);
    
    if (success) {
      setSelectedUserId('');
      setSelectedAccountId('');
      await loadUsers();
    }
    
    setIsAssigning(false);
  };

  // Remover usuario de cuenta
  const handleRemoveUser = async (userId: string, accountId: string) => {
    const success = await removeUserFromAccount(userId, accountId);
    
    if (success) {
      await loadUsers();
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando usuarios...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario de asignación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Asignar Usuario a Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'Sin nombre'} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.filter(account => account.status === 'active').map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleAssignUser} disabled={isAssigning} className="w-full">
                {isAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Asignando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Asignar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios con sus cuentas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Usuarios y sus Cuentas
          </CardTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Cuentas Asignadas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userAccounts.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sin cuentas asignadas</span>
                        ) : (
                          user.userAccounts.map((account) => (
                            <Badge key={account.id} variant="secondary" className="text-xs">
                              {account.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userAccounts.map((account) => (
                          <Button
                            key={account.id}
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveUser(user.id, account.id)}
                            className="h-6 px-2"
                          >
                            <UserMinus className="h-3 w-3 mr-1" />
                            Remover {account.name}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAccountAssignment;
