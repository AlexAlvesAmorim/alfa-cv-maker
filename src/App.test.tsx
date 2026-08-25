import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function advanceBot() {
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

describe('fluxo do chat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('da boas vindas e faz a primeira pergunta', () => {
    render(<App />);
    expect(screen.getByText(/Bem-vindo ao Alfa Curriculum Maker/i)).toBeInTheDocument();
    advanceBot();
    expect(screen.getByText(/qual é o seu nome completo/i)).toBeInTheDocument();
  });

  it('sanitiza o nome e avanca para a proxima etapa', () => {
    render(<App />);
    advanceBot();

    const input = screen.getByLabelText('Sua resposta');
    fireEvent.change(input, { target: { value: 'meu nome é joao silva' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText('meu nome é joao silva')).toBeInTheDocument();
    advanceBot();
    expect(screen.getByText(/seus dados de contato/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('alfa-cv-draft-v2')!).resume.fullName).toBe('Joao Silva');
  });

  it('recupera o rascunho salvo ao reabrir', () => {
    localStorage.setItem(
      'alfa-cv-draft-v2',
      JSON.stringify({
        resume: {
          fullName: 'Maria da Silva',
          targetRole: '',
          layout: '',
          contact: '',
          summary: '',
          experiences: [],
          education: '',
          skills: '',
          languages: '',
          photo: '',
          photoCircle: '',
          accentColor: '',
        },
        stepIndex: 1,
      }),
    );

    render(<App />);
    expect(screen.getByText(/recuperei seu rascunho/i)).toBeInTheDocument();
    advanceBot();
    expect(screen.getByText(/seus dados de contato/i)).toBeInTheDocument();
  });

  it('botao voltar retorna a etapa anterior', () => {
    render(<App />);
    advanceBot();

    const input = screen.getByLabelText('Sua resposta');
    fireEvent.change(input, { target: { value: 'Maria da Silva' } });
    fireEvent.submit(input.closest('form')!);
    advanceBot();

    fireEvent.click(screen.getByLabelText('Voltar etapa anterior'));
    advanceBot();
    const perguntas = screen.getAllByText(/qual é o seu nome completo/i);
    expect(perguntas.length).toBeGreaterThanOrEqual(1);
    expect(perguntas[perguntas.length - 1]).toBeInTheDocument();
  });
});
