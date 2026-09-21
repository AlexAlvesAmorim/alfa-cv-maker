import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisModal } from './components/AnalysisModal';

const STEPS = ['Carregando', 'Verificando compatibilidade', 'Terminando análise', 'Análise concluída'];

describe('modal de analise', () => {
  it('mostra as 4 fases e a atual em andamento', () => {
    render(
      <AnalysisModal step={1} score={null} tone="mid" label="" onCancel={() => {}} onClose={() => {}} />,
    );
    for (const name of STEPS) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText('Verificando compatibilidade...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('no fim mostra o score e o botao de fechar', () => {
    render(
      <AnalysisModal step={3} score={82} tone="high" label="Candidatura forte" onCancel={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Análise concluída ✓')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('mostra o relatorio dentro do modal quando pronto', () => {
    render(
      <AnalysisModal
        step={3}
        score={82}
        tone="high"
        label="Candidatura forte"
        report={<p>detalhe do encaixe</p>}
        onCancel={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('detalhe do encaixe')).toBeInTheDocument();
  });
});
