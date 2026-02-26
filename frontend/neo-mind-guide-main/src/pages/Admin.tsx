import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, RefreshCw, Check, X, LogOut, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  onboarding_completed: boolean;
  name: string | null;
  business: string | null;
  content_type: string | null;
  platform: string | null;
  communication_style: string | null;
  goal: string | null;
}

const Admin = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/prihlasit");
        return;
      }
      
      setCurrentUserId(session.user.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "list" }),
        }
      );

      if (response.status === 403) {
        toast({
          variant: "destructive",
          title: "Přístup odepřen",
          description: "Nemáte oprávnění pro přístup do admin prostředí.",
        });
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setIsAdmin(true);
    } catch (error) {
      console.error("Admin error:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se načíst data.",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleResetOnboarding = async (userId: string) => {
    try {
      setResettingId(userId);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/prihlasit");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "reset-onboarding", userId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset onboarding");
      }

      toast({
        title: "Úspěch",
        description: "Onboarding byl resetován.",
      });

      // Refresh user list
      await checkAdminAndFetchUsers();
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se resetovat onboarding.",
      });
    } finally {
      setResettingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setDeletingId(userId);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/prihlasit");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "delete-user", userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      toast({
        title: "Úspěch",
        description: "Uživatel byl smazán.",
      });

      // Refresh user list
      await checkAdminAndFetchUsers();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se smazat uživatele.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const countOnboardingSteps = (user: AdminUser) => {
    let count = 0;
    if (user.business) count++;
    if (user.content_type) count++;
    if (user.platform) count++;
    if (user.communication_style) count++;
    if (user.goal) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">NeoBot Admin</h1>
                <p className="text-sm text-muted-foreground">Správa aplikace</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground text-sm">Celkem uživatelů</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-muted-foreground text-sm">Dokončený onboarding</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {users.filter((u) => u.onboarding_completed).length}
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <X className="w-5 h-5 text-orange-500" />
                <span className="text-muted-foreground text-sm">Nedokončený onboarding</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {users.filter((u) => !u.onboarding_completed).length}
              </p>
            </div>
          </div>

          {/* Users table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Přehled uživatelů</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={checkAdminAndFetchUsers}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Obnovit
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">E-mail</TableHead>
                    <TableHead className="text-muted-foreground">Registrace</TableHead>
                    <TableHead className="text-muted-foreground">Poslední přihlášení</TableHead>
                    <TableHead className="text-muted-foreground">Onboarding</TableHead>
                    <TableHead className="text-muted-foreground">Kroky</TableHead>
                    <TableHead className="text-muted-foreground text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border/50">
                      <TableCell className="font-medium text-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.last_sign_in_at)}
                      </TableCell>
                      <TableCell>
                        {user.onboarding_completed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                            <Check className="w-3 h-3" />
                            Dokončen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium">
                            <X className="w-3 h-3" />
                            Nedokončen
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {countOnboardingSteps(user)} / 5
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetOnboarding(user.id)}
                            disabled={resettingId === user.id}
                            title="Resetovat onboarding - uživatel projde onboarding znovu"
                          >
                            {resettingId === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === user.id || user.id === currentUserId}
                                title={user.id === currentUserId ? "Nemůžete smazat sami sebe" : "Smazat uživatele"}
                              >
                                {deletingId === user.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat uživatele <strong>{user.email}</strong>? Tato akce je nevratná.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Smazat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Žádní uživatelé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
