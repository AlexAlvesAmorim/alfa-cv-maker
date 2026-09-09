import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error('[Alfa ErrorBoundary]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding:'24px', textAlign:'center', color:'var(--text-main)', background:'var(--surface)', border:'1px solid var(--border-red)', borderRadius:'12px', margin:'24px auto', maxWidth:'560px' }}>
          <h2 style={{fontSize:'16px', fontWeight:700, marginBottom:'8px'}}>Algo deu errado ao carregar o app</h2>
          <p style={{fontSize:'13px', color:'var(--text-muted)', marginBottom:'14px'}}>Seus dados salvos no navegador continuam preservados. Tente recarregar a página.</p>
          <button className="btn btn--primary" onClick={() => location.reload()}>Recarregar página</button>
        </div>
      );
    }
    return this.props.children;
  }
}
