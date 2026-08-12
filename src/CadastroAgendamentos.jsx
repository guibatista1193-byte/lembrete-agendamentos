import { useState, useEffect } from "react";
import { Plus, Trash2, Phone, Calendar, Clock, Users, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient.js";

// Versão conectada ao Supabase: os dados agora salvam de verdade no banco.

export default function CadastroAgendamentos() {
  const [negocioId, setNegocioId] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    setCarregando(true);
    try {
      const { data: negocios, error: erroBusca } = await supabase
        .from("negocios")
        .select("id")
        .limit(1);

      if (erroBusca) throw erroBusca;

      let id;
      if (negocios && negocios.length > 0) {
        id = negocios[0].id;
      } else {
        const { data: novoNegocio, error: erroCriar } = await supabase
          .from("negocios")
          .insert({ nome: "Meu Negócio" })
          .select()
          .single();
        if (erroCriar) throw erroCriar;
        id = novoNegocio.id;
      }

      setNegocioId(id);
      await carregarAgendamentos(id);
    } catch (err) {
      setErro("Não foi possível conectar ao banco: " + err.message);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarAgendamentos(negId) {
    const { data: lista, error } = await supabase
      .from("agendamentos")
      .select("id, data_hora, status, clientes(id, nome, telefone)")
      .eq("negocio_id", negId)
      .order("data_hora", { ascending: true });

    if (error) {
      setErro("Erro ao carregar agendamentos: " + error.message);
      return;
    }
    setAgendamentos(lista || []);
  }

  function formatarTelefone(valor) {
    return valor.replace(/\D/g, "");
  }

  async function adicionarAgendamento(e) {
    e.preventDefault();
    setErro("");

    if (!nome.trim() || !telefone.trim() || !data || !hora) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (telefone.length < 10) {
      setErro("Telefone parece incompleto. Use DDD + número.");
      return;
    }

    setSalvando(true);
    try {
      const { data: novoCliente, error: erroCliente } = await supabase
        .from("clientes")
        .insert({ negocio_id: negocioId, nome: nome.trim(), telefone })
        .select()
        .single();
      if (erroCliente) throw erroCliente;

      const dataHoraISO = new Date(`${data}T${hora}`).toISOString();
      const { error: erroAgendamento } = await supabase
        .from("agendamentos")
        .insert({
          negocio_id: negocioId,
          cliente_id: novoCliente.id,
          data_hora: dataHoraISO,
          status: "pendente",
        });
      if (erroAgendamento) throw erroAgendamento;

      await carregarAgendamentos(negocioId);

      setNome("");
      setTelefone("");
      setData("");
      setHora("");
    } catch (err) {
      setErro("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function removerAgendamento(id) {
    const { error } = await supabase.from("agendamentos").delete().eq("id", id);
    if (error) {
      setErro("Erro ao remover: " + error.message);
      return;
    }
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
  }

  function statusInfo(status) {
    const mapa = {
      pendente: { label: "Pendente", cor: "#8a8578", bg: "#f0eee6" },
      lembrete_enviado: { label: "Lembrete enviado", cor: "#8a6d3b", bg: "#f7ecd9" },
      confirmado: { label: "Confirmado", cor: "#2f6b4f", bg: "#e3f0e9" },
      cancelado: { label: "Cancelado", cor: "#9b3b3b", bg: "#f7e6e6" },
      faltou: { label: "Faltou", cor: "#9b3b3b", bg: "#f7e6e6" },
    };
    return mapa[status] || mapa.pendente;
  }

  function formatarDataHora(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (carregando) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf9f6" }}>
        <Loader2 size={24} className="spin" color="#2f6b4f" />
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#2f6b4f", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={18} color="#faf9f6" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#26241f", margin: 0, letterSpacing: "-0.02em" }}>
              Agenda &amp; Lembretes
            </h1>
          </div>
          <p style={{ color: "#7a7669", fontSize: 14, margin: 0 }}>
            Cadastre um cliente e o horário — os dados já salvam direto no seu banco Supabase.
          </p>
        </header>

        <form
          onSubmit={adicionarAgendamento}
          style={{
            background: "#fff",
            border: "1px solid #e8e5db",
            borderRadius: 14,
            padding: 20,
            marginBottom: 28,
          }}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome do cliente</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ex: Maria Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Telefone (WhatsApp)</label>
              <div style={{ position: "relative" }}>
                <Phone size={15} color="#a8a396" style={{ position: "absolute", left: 12, top: 13 }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 34 }}
                  type="tel"
                  placeholder="47988887777"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Data</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora</label>
                <input
                  style={inputStyle}
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>

            {erro && <p style={{ color: "#9b3b3b", fontSize: 13, margin: 0 }}>{erro}</p>}

            <button
              type="submit"
              disabled={salvando}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: salvando ? "#7a9d8a" : "#2f6b4f",
                color: "#faf9f6",
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: salvando ? "default" : "pointer",
              }}
            >
              {salvando ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              {salvando ? "Salvando..." : "Adicionar agendamento"}
            </button>
          </div>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Users size={16} color="#7a7669" />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#7a7669", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Agendamentos ({agendamentos.length})
          </h2>
        </div>

        {agendamentos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#a8a396", fontSize: 14 }}>
            Nenhum agendamento ainda. Cadastre o primeiro acima.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {agendamentos.map((a) => {
              const s = statusInfo(a.status);
              return (
                <div
                  key={a.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e5db",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#26241f", fontSize: 15 }}>
                      {a.clientes?.nome}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7a7669", fontSize: 13, marginTop: 3 }}>
                      <Clock size={12} />
                      {formatarDataHora(a.data_hora)}
                      <span style={{ color: "#c9c5b8" }}>·</span>
                      {a.clientes?.telefone}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: s.cor,
                        background: s.bg,
                        padding: "4px 9px",
                        borderRadius: 20,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.label}
                    </span>
                    <button
                      onClick={() => removerAgendamento(a.id)}
                      aria-label="Remover agendamento"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: "#c9857f",
                        display: "flex",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#7a7669",
  marginBottom: 5,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ddd9cc",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "#26241f",
  outline: "none",
  fontFamily: "inherit",
};
