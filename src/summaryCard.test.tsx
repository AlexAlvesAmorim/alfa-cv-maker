import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SummaryCard } from './components/SummaryCard';
import { FICTIONAL_RESUME } from './data/fictionalResume';
import type { ResumeData } from './types';

function renderCard(resume: ResumeData = FICTIONAL_RESUME) {
  const onResumeUpdate = vi.fn();
  render(
    <SummaryCard
      resume={resume}
      onRestart={vi.fn()}
      onEditField={vi.fn()}
      onAccentChange={vi.fn()}
      onResumeUpdate={onResumeUpdate}
      onGoMatch={vi.fn()}
    />,
  );
  return { onResumeUpdate };
}

describe('edicao manual no painel final', () => {
  afterEach(() => {
    cleanup();
  });

  it('edita o nome inline e salva', () => {
    const { onResumeUpdate } = renderCard();
    fireEvent.click(screen.getByLabelText(/editar nome manualmente/i));
    const input = screen.getByLabelText('Editar nome');
    fireEvent.change(input, { target: { value: 'Maria Editada' } });
    fireEvent.click(screen.getByText('Salvar'));
    expect(onResumeUpdate).toHaveBeenCalledWith({ fullName: 'Maria Editada' });
  });

  it('cancelar descarta a edicao', () => {
    const { onResumeUpdate } = renderCard();
    fireEvent.click(screen.getByLabelText(/editar objetivo manualmente/i));
    fireEvent.change(screen.getByLabelText('Editar objetivo'), { target: { value: 'Rascunho' } });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onResumeUpdate).not.toHaveBeenCalled();
  });

  it('troca a densidade do texto', () => {
    const { onResumeUpdate } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Enxuto' }));
    expect(onResumeUpdate).toHaveBeenCalledWith({ fontScale: 0.84 });
  });

  it('adiciona e exclui projeto', () => {
    const { onResumeUpdate } = renderCard();
    fireEvent.click(screen.getByText('+ Adicionar projeto'));
    expect(onResumeUpdate).toHaveBeenCalledWith({
      projects: [...FICTIONAL_RESUME.projects, { title: '', stack: '', link: '', bullets: [] }],
    });

    cleanup();
    const second = renderCard();
    const excluir = screen.getAllByText('Excluir projeto');
    fireEvent.click(excluir[0]);
    expect(second.onResumeUpdate).toHaveBeenCalledWith({ projects: [] });
  });
});
