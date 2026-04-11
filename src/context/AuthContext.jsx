import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perfilLoading, setPerfilLoading] = useState(false);

  async function carregarPerfil(userId) {
    if (!userId) {
      setPerfil(null);
      localStorage.removeItem("perfil_usuario");
      return;
    }

    try {
      setPerfilLoading(true);

      const perfilCache = localStorage.getItem("perfil_usuario");
      if (perfilCache) {
        const perfilParseado = JSON.parse(perfilCache);
        if (perfilParseado?.id === userId) {
          setPerfil(perfilParseado);
        }
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar perfil:", error);
        setPerfil(null);
        localStorage.removeItem("perfil_usuario");
        return;
      }

      if (!data) {
        setPerfil(null);
        localStorage.removeItem("perfil_usuario");
        return;
      }

      setPerfil(data);
      localStorage.setItem("perfil_usuario", JSON.stringify(data));
    } catch (error) {
      console.error("Erro inesperado ao carregar perfil:", error);
      setPerfil(null);
      localStorage.removeItem("perfil_usuario");
    } finally {
      setPerfilLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        setLoading(false);
        carregarPerfil(data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error("Erro no login:", error);
      return { error };
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      setUser(null);
      setPerfil(null);
      setLoading(false);
      setPerfilLoading(false);
      localStorage.removeItem("perfil_usuario");
    }
  }

  useEffect(() => {
    let ativo = true;

    async function init() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!ativo) return;

        if (error) {
          console.error("Erro ao obter sessão:", error);
          setUser(null);
          setPerfil(null);
          setLoading(false);
          return;
        }

        const authUser = session?.user ?? null;
        setUser(authUser);
        setLoading(false);

        if (authUser) {
          carregarPerfil(authUser.id);
        } else {
          setPerfil(null);
          localStorage.removeItem("perfil_usuario");
        }
      } catch (error) {
        console.error("Erro ao iniciar auth:", error);
        if (!ativo) return;
        setUser(null);
        setPerfil(null);
        setLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;

      const authUser = session?.user ?? null;
      setUser(authUser);
      setLoading(false);

      if (authUser) {
        carregarPerfil(authUser.id);
      } else {
        setPerfil(null);
        setPerfilLoading(false);
        localStorage.removeItem("perfil_usuario");
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        loading,
        perfilLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}