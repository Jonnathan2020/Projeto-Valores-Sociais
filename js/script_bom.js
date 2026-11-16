/* ==========================================================
   Valores Sociais — script.js (Unificado e com Leitura por Foco/Tab)
   Sem banco de dados: tudo é gravado no localStorage.

   O que este arquivo faz:
   1) Acessibilidade:
      - Lembra tamanho da fonte e alto contraste entre páginas
      - Leitura em voz alta (Web Speech API) por botão OU ao navegar com Tab/foco
      - Tradução para Libras (VLibras, widget gratuito do governo federal)
   2) solucao.html: valida e grava o formulário de candidatura
      (voluntário / estudante / investidor).
   3) contato.html: valida e grava o formulário de contato
      (somente se você adicionar o formulário opcional).
   4) Painel (candidaturas.html): lista, exclui e exporta os
      registros salvos (somente se a página tiver <table data-chave>).

   Funciona com <script src="js/script.js" defer></script>
   ou sem defer (tudo roda após o DOM carregar).
   ========================================================== */
   (function () {
    'use strict';
  
    const PREFIXO = 'valoresSociais:';
  
    /* ---------------------------------------------------------
       ARMAZENAMENTO (localStorage)
       --------------------------------------------------------- */
    const Store = {
      ler(chave, padrao = []) {
        try {
          const bruto = localStorage.getItem(PREFIXO + chave);
          return bruto ? JSON.parse(bruto) : padrao;
        } catch (e) {
          return padrao;
        }
      },
      gravar(chave, valor) {
        try {
          localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
          return true;
        } catch (e) {
          return false; // bloqueado ou cheio
        }
      },
      adicionar(chave, registro) {
        const lista = this.ler(chave, []);
        const novo = Object.assign({ id: gerarId(), criadoEm: new Date().toISOString() }, registro);
        lista.push(novo);
        return this.gravar(chave, lista) ? novo : null;
      },
      removerPorId(chave, id) {
        return this.gravar(chave, this.ler(chave, []).filter(r => r.id !== id));
      },
      limpar(chave) {
        try { localStorage.removeItem(PREFIXO + chave); } catch (e) { /* ignora */ }
      }
    };
  
    function gerarId() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  
    /* ---------------------------------------------------------
       1) ACESSIBILIDADE
          - Preferências (tamanho de fonte, alto contraste, leitura ao navegar)
          - Leitura em voz alta (Web Speech API)
          - Tradução para Libras (VLibras)
       --------------------------------------------------------- */
    function iniciarPreferencias() {
      const tamanhos = ['fs-normal', 'fs-large', 'fs-xl'];
      const contraste = document.getElementById('contrast-on');
      const prefs = Store.ler('prefs', {});
  
      // Compatibilidade caso existam preferências antigas em 'vs-acessibilidade'
      if (!prefs.fonte && !prefs.tamanho && typeof prefs.contraste !== 'boolean') {
        try {
          const antigo = JSON.parse(localStorage.getItem('vs-acessibilidade'));
          if (antigo) Object.assign(prefs, antigo);
        } catch (e) { /* ignora */ }
      }
  
      const tamanhoSalvo = prefs.fonte || prefs.tamanho;
      const salvo = tamanhos.includes(tamanhoSalvo) ? document.getElementById(tamanhoSalvo) : null;
      if (salvo) salvo.checked = true;
      if (contraste && typeof prefs.contraste === 'boolean') {
        contraste.checked = prefs.contraste;
      }
  
      tamanhos.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
          if (el.checked) {
            const p = Store.ler('prefs', {});
            p.fonte = id;
            Store.gravar('prefs', p);
          }
        });
      });
  
      if (contraste) {
        contraste.addEventListener('change', () => {
          const p = Store.ler('prefs', {});
          p.contraste = contraste.checked;
          Store.gravar('prefs', p);
        });
      }
    }
  
    function dividirEmTrechos(texto) {
      // Trechos curtos evitam que alguns navegadores interrompam a leitura no meio.
      const trechos = [];
      texto.split(/\n+/).forEach(linha => {
        linha = linha.replace(/\s+/g, ' ').trim();
        if (!linha) return;
        if (!/[.!?:;…]$/.test(linha)) linha += '.';
        const frases = linha.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [linha];
        let atual = '';
        frases.forEach(f => {
          if (atual && (atual + f).length > 180) {
            trechos.push(atual.trim());
            atual = '';
          }
          atual += f;
        });
        if (atual.trim()) trechos.push(atual.trim());
      });
      return trechos;
    }
  
    function descreverElementoFocado(el) {
      if (!el || el === document.body) return '';
  
      // 1. aria-label ou aria-labelledby explícito
      let rotulo = el.getAttribute('aria-label') || '';
      const labelledBy = el.getAttribute('aria-labelledby');
      if (!rotulo && labelledBy) {
        rotulo = labelledBy.split(/\s+/)
          .map(id => document.getElementById(id))
          .filter(Boolean)
          .map(n => n.innerText.trim())
          .join(' ');
      }
  
      // 2. <label for="..."> ou <label> envolvente
      if (!rotulo && el.id) {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) rotulo = lbl.innerText.trim();
      }
      if (!rotulo) {
        const parentLabel = el.closest('label');
        if (parentLabel) rotulo = parentLabel.innerText.trim();
      }
  
      // 3. Texto interno, placeholder, title ou alt
      if (!rotulo) {
        rotulo = (el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('alt') || '').trim();
      }
  
      rotulo = rotulo.replace(/\s+/g, ' ').trim();
      if (!rotulo) return '';
  
      // Identifica o papel do elemento para orientar o usuário
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();
  
      let tipoTexto = '';
      if (tag === 'a' || role === 'link') {
        tipoTexto = 'Link';
      } else if (tag === 'button' || role === 'button' || type === 'submit' || type === 'button') {
        tipoTexto = 'Botão';
      } else if (tag === 'select') {
        const opt = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : '';
        tipoTexto = 'Caixa de seleção' + (opt ? ', selecionado: ' + opt : '');
      } else if (tag === 'textarea') {
        tipoTexto = 'Campo de texto';
      } else if (tag === 'input') {
        if (type === 'checkbox') {
          tipoTexto = 'Caixa de marcação, ' + (el.checked ? 'marcado' : 'desmarcado');
        } else if (type === 'radio') {
          tipoTexto = 'Opção, ' + (el.checked ? 'selecionada' : 'não selecionada');
        } else {
          tipoTexto = 'Campo de texto';
        }
      }
  
      return tipoTexto ? (tipoTexto + ': ' + rotulo) : rotulo;
    }
  
    function iniciarLeitura() {
      const synth = window.speechSynthesis;
      if (!synth || !window.SpeechSynthesisUtterance) return;
      const barra = document.querySelector('.a11y-bar .wrap');
      if (!barra || barra.querySelector('[data-tts="pagina"]')) return;
  
      const prefs = Store.ler('prefs', {});
      // Leitura ao navegar com Tab vem ativada por padrão (pode ser desativada pelo usuário)
      let lerAoFocar = typeof prefs.lerAoFocar === 'boolean' ? prefs.lerAoFocar : true;
  
      const grupo = document.createElement('div');
      grupo.className = 'a11y-group';
      grupo.setAttribute('role', 'group');
      grupo.setAttribute('aria-label', 'Leitura em voz alta');
      grupo.innerHTML =
        '<span class="lbl">Leitura em voz alta</span>' +
        '<button type="button" data-tts="foco" aria-pressed="' + (lerAoFocar ? 'true' : 'false') + '">' +
          (lerAoFocar ? 'Leitura ao navegar (Tab): Ativa' : 'Leitura ao navegar (Tab): Desativada') +
        '</button>' +
        '<button type="button" data-tts="pagina">Ouvir página</button>' +
        '<button type="button" data-tts="selecao">Ouvir seleção</button>' +
        '<button type="button" data-tts="pausa" aria-pressed="false" disabled>Pausar</button>' +
        '<button type="button" data-tts="parar" disabled>Parar</button>' +
        '<select data-tts="velocidade" aria-label="Velocidade da leitura">' +
          '<option value="0.85">Lenta</option>' +
          '<option value="1">Normal</option>' +
          '<option value="1.25">Rápida</option>' +
        '</select>' +
        '<span class="tts-status" role="status" aria-live="polite"></span>';
      barra.appendChild(grupo);
  
      const btnFoco = grupo.querySelector('[data-tts="foco"]');
      const btnPagina = grupo.querySelector('[data-tts="pagina"]');
      const btnSelecao = grupo.querySelector('[data-tts="selecao"]');
      const btnPausa = grupo.querySelector('[data-tts="pausa"]');
      const btnParar = grupo.querySelector('[data-tts="parar"]');
      const selVel = grupo.querySelector('[data-tts="velocidade"]');
      const status = grupo.querySelector('.tts-status');
  
      let sessao = 0, falando = false, pausado = false, ultimaSelecao = '';
      if (prefs.velocidade) selVel.value = prefs.velocidade;
      if (selVel.value !== String(prefs.velocidade || selVel.value)) selVel.value = '1';
  
      function avisar(msg) { status.textContent = msg; }
  
      function atualizar() {
        btnPausa.textContent = pausado ? 'Continuar' : 'Pausar';
        btnPausa.setAttribute('aria-pressed', pausado ? 'true' : 'false');
        btnPausa.disabled = !falando;
        btnParar.disabled = !falando;
      }
  
      function escolherVoz() {
        const vozes = synth.getVoices();
        for (let i = 0; i < vozes.length; i++) {
          if ((vozes[i].lang || '').replace('_', '-').toLowerCase() === 'pt-br') return vozes[i];
        }
        for (let i = 0; i < vozes.length; i++) {
          if ((vozes[i].lang || '').toLowerCase().indexOf('pt') === 0) return vozes[i];
        }
        return null;
      }
  
      function parar() {
        sessao++;
        synth.cancel();
        falando = false;
        pausado = false;
        atualizar();
      }
  
      // Fala rápida e direta ao focar com Tab (não altera o estado dos botões Pausar/Parar)
      function falarElemento(texto) {
        if (!texto) return;
        sessao++;
        synth.cancel();
        falando = false;
        pausado = false;
        atualizar();
  
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'pt-BR';
        u.rate = parseFloat(selVel.value) || 1;
        const voz = escolherVoz();
        if (voz) u.voice = voz;
        synth.speak(u);
      }
  
      function falar(texto, descricao) {
        parar();
        const trechos = dividirEmTrechos(texto);
        if (!trechos.length) { avisar('Não há texto para ler.'); return; }
  
        const voz = escolherVoz();
        if (!voz && synth.getVoices().length) {
          avisar('Este navegador não tem voz em português; a leitura pode soar estranha.');
        } else {
          avisar(descricao);
        }
  
        const minha = ++sessao;
        let i = 0;
        falando = true;
        atualizar();
  
        (function proximo() {
          if (minha !== sessao) return;
          if (i >= trechos.length) {
            falando = false;
            pausado = false;
            atualizar();
            avisar('Leitura concluída.');
            return;
          }
          const u = new SpeechSynthesisUtterance(trechos[i++]);
          u.lang = 'pt-BR';
          u.rate = parseFloat(selVel.value) || 1;
          if (voz) u.voice = voz;
          u.onend = proximo;
          u.onerror = function (e) {
            if (minha !== sessao) return;
            if (e.error === 'canceled' || e.error === 'interrupted') return;
            falando = false;
            pausado = false;
            atualizar();
            avisar('Não foi possível ler o texto neste navegador.');
          };
          synth.speak(u);
        })();
      }
  
      // Escuta navegação por foco (Tab / Shift+Tab) em qualquer link, botão ou campo
      document.addEventListener('focusin', e => {
        if (!lerAoFocar) return;
        const descricao = descreverElementoFocado(e.target);
        if (descricao) falarElemento(descricao);
      });

      // Garante que pressionar Enter em um link ou botão focado execute a ação imediatamente
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const alvo = document.activeElement;
        if (!alvo) return;
  
        if (alvo.matches('a[href]')) {
          e.preventDefault();
          alvo.click();
        }
    });
  
      // Anuncia mudança de estado em checkboxes, radios e selects enquanto navega
      document.addEventListener('change', e => {
        if (!lerAoFocar) return;
        if (e.target.matches('input[type="checkbox"], input[type="radio"], select')) {
          const descricao = descreverElementoFocado(e.target);
          if (descricao) falarElemento(descricao);
        }
      });
  
      btnFoco.addEventListener('click', () => {
        lerAoFocar = !lerAoFocar;
        btnFoco.setAttribute('aria-pressed', lerAoFocar ? 'true' : 'false');
        btnFoco.textContent = lerAoFocar ? 'Leitura ao navegar (Tab): Ativa' : 'Leitura ao navegar (Tab): Desativada';
        const p = Store.ler('prefs', {});
        p.lerAoFocar = lerAoFocar;
        Store.gravar('prefs', p);
        if (!lerAoFocar) {
          parar();
          avisar('Leitura ao navegar desativada.');
        } else {
          falarElemento('Leitura ao navegar com Tab ativada.');
        }
      });
  
      document.addEventListener('selectionchange', () => {
        const t = String(window.getSelection() || '').trim();
        if (t) ultimaSelecao = t;
      });
  
      btnPagina.addEventListener('click', () => {
        const alvo = document.getElementById('conteudo') || document.body;
        falar(alvo.innerText, 'Lendo o conteúdo da página.');
      });
  
      btnSelecao.addEventListener('click', () => {
        const t = String(window.getSelection() || '').trim() || ultimaSelecao;
        if (!t) { avisar('Selecione um trecho do texto e clique de novo.'); return; }
        falar(t, 'Lendo o trecho selecionado.');
      });
  
      btnPausa.addEventListener('click', () => {
        if (!falando) return;
        if (pausado) { synth.resume(); pausado = false; avisar('Leitura retomada.'); }
        else { synth.pause(); pausado = true; avisar('Leitura pausada.'); }
        atualizar();
      });
  
      btnParar.addEventListener('click', () => {
        parar();
        avisar('Leitura interrompida.');
      });
  
      selVel.addEventListener('change', () => {
        const p = Store.ler('prefs', {});
        p.velocidade = selVel.value;
        Store.gravar('prefs', p);
        if (falando) avisar('A nova velocidade vale a partir do próximo trecho.');
      });
  
      window.addEventListener('pagehide', () => { synth.cancel(); });
    }
  
    function iniciarLibras() {
      if (document.querySelector('[vw]')) return;
      const caixa = document.createElement('div');
      caixa.setAttribute('vw', '');
      caixa.className = 'enabled';
      caixa.innerHTML =
        '<div vw-access-button class="active"></div>' +
        '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
      document.body.appendChild(caixa);
  
      const s = document.createElement('script');
      s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      s.onload = () => {
        if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app');
      };
      document.body.appendChild(s);
    }
  
    function iniciarAcessibilidade() {
      iniciarPreferencias();
      iniciarLeitura();
      iniciarLibras();
    }
  
    /* ---------------------------------------------------------
       UTILIDADES DE INTERFACE (erros e mensagens)
       --------------------------------------------------------- */
    function areaDe(ref) {
      return ref.closest('.field') || ref.closest('fieldset') || ref.parentNode;
    }
  
    function mostrarErro(ref, chave, texto) {
      const area = areaDe(ref);
      let p = area.querySelector('.erro[data-de="' + chave + '"]');
      if (!p) {
        p = document.createElement('p');
        p.className = 'erro';
        p.dataset.de = chave;
        p.id = 'erro-' + chave;
        p.setAttribute('role', 'alert');
        area.appendChild(p);
      }
      p.textContent = texto;
      if (ref.matches('input, select, textarea')) {
        ref.classList.add('is-invalid');
        ref.setAttribute('aria-invalid', 'true');
        ref.setAttribute('aria-describedby', p.id);
      }
    }
  
    function limparErro(ref, chave) {
      const area = areaDe(ref);
      const p = area.querySelector('.erro[data-de="' + chave + '"]');
      if (p) p.remove();
      if (ref.matches('input, select, textarea')) {
        ref.classList.remove('is-invalid');
        ref.removeAttribute('aria-invalid');
        ref.removeAttribute('aria-describedby');
      }
    }
  
    function limparTodosErros(form) {
      form.querySelectorAll('.erro').forEach(p => p.remove());
      form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      });
    }
  
    function aviso(form, texto, tipo) {
      let caixa = form.querySelector('.form-msg');
      if (!caixa) {
        caixa = document.createElement('div');
        caixa.className = 'form-msg';
        caixa.setAttribute('role', 'status');
        caixa.setAttribute('aria-live', 'polite');
        const linhaEnvio = form.querySelector('.submit-row');
        form.insertBefore(caixa, linhaEnvio || null);
      }
      caixa.className = 'form-msg form-msg-' + tipo;
      caixa.textContent = texto;
      caixa.hidden = false;
    }
  
    function esconderAviso(form) {
      const caixa = form.querySelector('.form-msg');
      if (caixa) caixa.hidden = true;
    }
  
    /* ---------------------------------------------------------
       REGRAS DE VALIDAÇÃO
       --------------------------------------------------------- */
    const REGEX_NOME = /^[\p{L}][\p{L}' .-]*$/u;
    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  
    function validarNome(valor) {
      if (!valor) return 'Campo obrigatório.';
      if (valor.length < 2 || !REGEX_NOME.test(valor)) return 'Use apenas letras (mínimo de 2 caracteres).';
      return '';
    }
  
    function validarEmail(valor) {
      if (!valor) return 'Informe seu e-mail.';
      if (!REGEX_EMAIL.test(valor)) return 'E-mail inválido. Exemplo: nome@dominio.com';
      return '';
    }
  
    /* ---------------------------------------------------------
       2) FORMULÁRIO DE CANDIDATURA (solucao.html)
       --------------------------------------------------------- */
  
    function tipoSelecionado(form) {
      const r = form.querySelector('input[name="tipo"]:checked');
      return r ? r.id.replace('tipo-', '') : '';
    }
  
    function validarCandidatura(form) {
      const erros = [];
      const campo = n => form.elements[n];
      const valor = n => campo(n).value.trim();
      const add = (ref, chave, msg) => erros.push({ ref, chave, msg });
      const tipo = tipoSelecionado(form);
  
      ['nome', 'sobrenome'].forEach(n => {
        const msg = validarNome(valor(n));
        if (msg) add(campo(n), n, msg);
      });
  
      const msgEmail = validarEmail(valor('email'));
      if (msgEmail) add(campo('email'), 'email', msgEmail);
  
      if (!tipo) {
        add(form.querySelector('fieldset'), 'tipo', 'Escolha o tipo de candidatura.');
      }
  
      if (tipo === 'voluntario') {
        const nasc = valor('data_nasc');
        if (nasc) {
          const d = new Date(nasc + 'T00:00:00');
          if (isNaN(d) || d.getFullYear() < 1900) add(campo('data_nasc'), 'data_nasc', 'Data inválida.');
          else if (d > new Date()) add(campo('data_nasc'), 'data_nasc', 'A data não pode ser no futuro.');
        }
        if (valor('habilidades').length > 500) {
          add(campo('habilidades'), 'habilidades', 'Máximo de 500 caracteres.');
        }
        const areas = form.querySelectorAll('input[name="area"]:checked');
        if (!areas.length) {
          add(form.querySelector('.for-vol fieldset'), 'area', 'Marque pelo menos uma área de interesse.');
        }
      }
  
      if (tipo === 'estudante') {
        const nec = valor('necessidade');
        if (!nec) add(campo('necessidade'), 'necessidade', 'Conte o que você mais precisa agora.');
        else if (nec.length < 10) add(campo('necessidade'), 'necessidade', 'Escreva pelo menos 10 caracteres.');
        else if (nec.length > 500) add(campo('necessidade'), 'necessidade', 'Máximo de 500 caracteres.');
      }
  
      return erros;
    }
  
    function coletarCandidatura(form) {
      const v = n => form.elements[n].value.trim();
      const tipo = tipoSelecionado(form);
      const dados = {
        tipo,
        nome: v('nome'),
        sobrenome: v('sobrenome'),
        email: v('email').toLowerCase()
      };
  
      if (tipo === 'voluntario') {
        dados.sexo = v('sexo') || 'Não informado';
        dados.data_nasc = v('data_nasc');
        dados.habilidades = v('habilidades');
        dados.area = Array.from(form.querySelectorAll('input[name="area"]:checked')).map(c => c.value);
      } else if (tipo === 'estudante') {
        dados.etapa = v('etapa');
        dados.necessidade = v('necessidade');
      } else if (tipo === 'investidor') {
        dados.interesse_invest = v('interesse_invest');
      }
      return dados;
    }
  
    /* ---------------------------------------------------------
       3) FORMULÁRIO DE CONTATO (opcional, contato.html)
       --------------------------------------------------------- */
    function validarContato(form) {
      const erros = [];
      const campo = n => form.elements[n];
      const valor = n => campo(n).value.trim();
  
      const msgNome = validarNome(valor('nome'));
      if (msgNome) erros.push({ ref: campo('nome'), chave: 'nome', msg: msgNome });
  
      const msgEmail = validarEmail(valor('email'));
      if (msgEmail) erros.push({ ref: campo('email'), chave: 'email', msg: msgEmail });
  
      const m = valor('mensagem');
      if (!m) erros.push({ ref: campo('mensagem'), chave: 'mensagem', msg: 'Escreva sua mensagem.' });
      else if (m.length < 10) erros.push({ ref: campo('mensagem'), chave: 'mensagem', msg: 'Escreva pelo menos 10 caracteres.' });
      else if (m.length > 1000) erros.push({ ref: campo('mensagem'), chave: 'mensagem', msg: 'Máximo de 1000 caracteres.' });
  
      return erros;
    }
  
    function coletarContato(form) {
      const v = n => form.elements[n] ? form.elements[n].value.trim() : '';
      return {
        nome: v('nome'),
        email: v('email').toLowerCase(),
        assunto: v('assunto') || 'Não informado',
        mensagem: v('mensagem')
      };
    }
  
    /* ---------------------------------------------------------
       MOTOR GENÉRICO DOS FORMULÁRIOS
       --------------------------------------------------------- */
    const FORMULARIOS = [
      {
        seletor: 'form.formulario',
        chave: 'candidaturas',
        validar: validarCandidatura,
        coletar: coletarCandidatura,
        duplicado: (lista, d) => lista.some(r => r.email === d.email && r.tipo === d.tipo),
        msgDuplicado: 'Já existe uma candidatura deste tipo com este e-mail.',
        campoDuplicado: 'email',
        sucesso: 'Candidatura enviada com sucesso! Entraremos em contato pelo e-mail informado.'
      },
      {
        seletor: 'form.formulario-contato',
        chave: 'contatos',
        validar: validarContato,
        coletar: coletarContato,
        sucesso: 'Mensagem enviada! Obrigado pelo contato.'
      }
    ];
  
    function iniciarFormulario(cfg) {
      const form = document.querySelector(cfg.seletor);
      if (!form) return;
  
      form.noValidate = true;
  
      function validarUm(el) {
        if (!el.name) return;
        const erro = cfg.validar(form).find(e => e.chave === el.name);
        const ref = erro ? erro.ref : el;
        erro ? mostrarErro(ref, el.name, erro.msg) : limparErro(el, el.name);
      }
  
      form.addEventListener('focusout', e => {
        if (e.target.matches('input[type="text"], input[type="date"], textarea, select')) validarUm(e.target);
      });
  
      form.addEventListener('input', e => {
        if (e.target.classList.contains('is-invalid')) validarUm(e.target);
        esconderAviso(form);
      });
  
      form.addEventListener('change', e => {
        if (e.target.name === 'tipo') {
          form.querySelectorAll('.conditional-fields .erro').forEach(p => p.remove());
          form.querySelectorAll('.conditional-fields .is-invalid').forEach(el => el.classList.remove('is-invalid'));
        }
        if (e.target.name === 'area') {
          const fs = e.target.closest('fieldset');
          if (fs && fs.querySelector('input[name="area"]:checked')) limparErro(fs, 'area');
        }
        esconderAviso(form);
      });
  
      form.addEventListener('submit', e => {
        e.preventDefault();
        limparTodosErros(form);
  
        const erros = cfg.validar(form);
        if (erros.length) {
          erros.forEach(er => mostrarErro(er.ref, er.chave, er.msg));
          aviso(form, 'Corrija os campos destacados e envie novamente.', 'erro');
          const primeiro = erros[0].ref;
          const foco = primeiro.matches('input, select, textarea') ? primeiro : primeiro.querySelector('input, select, textarea');
          if (foco) foco.focus();
          return;
        }
  
        const dados = cfg.coletar(form);
  
        if (cfg.duplicado && cfg.duplicado(Store.ler(cfg.chave, []), dados)) {
          mostrarErro(form.elements[cfg.campoDuplicado], cfg.campoDuplicado, cfg.msgDuplicado);
          form.elements[cfg.campoDuplicado].focus();
          aviso(form, cfg.msgDuplicado, 'erro');
          return;
        }
  
        if (!Store.adicionar(cfg.chave, dados)) {
          aviso(form, 'Não foi possível salvar: o armazenamento do navegador está bloqueado ou cheio.', 'erro');
          return;
        }
  
        form.reset();
        aviso(form, cfg.sucesso, 'sucesso');
      });
    }
  
    /* ---------------------------------------------------------
       4) PAINEL DE REGISTROS (candidaturas.html)
       --------------------------------------------------------- */
    const ROTULOS = {
      criadoEm: 'Enviado em', tipo: 'Tipo', nome: 'Nome', sobrenome: 'Sobrenome',
      email: 'E-mail', sexo: 'Sexo', data_nasc: 'Nascimento', habilidades: 'Habilidades',
      area: 'Áreas de interesse', etapa: 'Etapa', necessidade: 'Necessidade',
      interesse_invest: 'Interesse em investir', assunto: 'Assunto', mensagem: 'Mensagem'
    };
  
    function formatarValor(coluna, valor) {
      if (valor === undefined || valor === null || valor === '') return '—';
      if (Array.isArray(valor)) return valor.join(', ');
      if (coluna === 'criadoEm') return new Date(valor).toLocaleString('pt-BR');
      if (coluna === 'data_nasc') {
        const [a, m, d] = String(valor).split('-');
        return d ? d + '/' + m + '/' + a : valor;
      }
      return String(valor);
    }
  
    function colunasDe(lista) {
      const todas = [];
      lista.forEach(r => Object.keys(r).forEach(k => {
        if (k !== 'id' && !todas.includes(k)) todas.push(k);
      }));
      return todas;
    }
  
    function desenharTabela(tabela) {
      const chave = tabela.dataset.chave;
      const lista = Store.ler(chave, []);
      tabela.innerHTML = '';
  
      const contador = document.querySelector('[data-contador="' + chave + '"]');
      if (contador) contador.textContent = lista.length;
  
      if (!lista.length) {
        const tr = tabela.insertRow();
        const td = tr.insertCell();
        td.textContent = 'Nenhum registro encontrado.';
        return;
      }
  
      const colunas = colunasDe(lista);
      const cab = tabela.createTHead().insertRow();
      colunas.forEach(c => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = ROTULOS[c] || c;
        cab.appendChild(th);
      });
      const thAcoes = document.createElement('th');
      thAcoes.scope = 'col';
      thAcoes.textContent = 'Ações';
      cab.appendChild(thAcoes);
  
      const corpo = tabela.createTBody();
      lista.forEach(reg => {
        const tr = corpo.insertRow();
        colunas.forEach(c => { tr.insertCell().textContent = formatarValor(c, reg[c]); });
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Excluir';
        btn.dataset.excluir = reg.id;
        tr.insertCell().appendChild(btn);
      });
    }
  
    function baixar(nome, conteudo, tipo) {
      const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  
    function exportarCSV(chave) {
      const lista = Store.ler(chave, []);
      if (!lista.length) return alert('Não há registros para exportar.');
      const colunas = colunasDe(lista);
      const celula = v => {
        let t = Array.isArray(v) ? v.join('; ') : String(v === undefined || v === null ? '' : v);
        if (/^[=+\-@]/.test(t)) t = "'" + t;
        return '"' + t.replace(/"/g, '""') + '"';
      };
      const linhas = [colunas.map(c => celula(ROTULOS[c] || c)).join(';')]
        .concat(lista.map(r => colunas.map(c => celula(r[c])).join(';')));
      baixar(chave + '.csv', '\ufeff' + linhas.join('\r\n'), 'text/csv;charset=utf-8');
    }
  
    function exportarJSON(chave) {
      baixar(chave + '.json', JSON.stringify(Store.ler(chave, []), null, 2), 'application/json');
    }
  
    function iniciarPainel() {
      const tabelas = document.querySelectorAll('table[data-chave]');
      tabelas.forEach(tabela => {
        desenharTabela(tabela);
        tabela.addEventListener('click', e => {
          const id = e.target.dataset && e.target.dataset.excluir;
          if (id && confirm('Excluir este registro?')) {
            Store.removerPorId(tabela.dataset.chave, id);
            desenharTabela(tabela);
          }
        });
      });
  
      document.querySelectorAll('[data-acao]').forEach(btn => {
        btn.addEventListener('click', () => {
          const chave = btn.dataset.chave;
          const acao = btn.dataset.acao;
          if (acao === 'exportar-csv') exportarCSV(chave);
          if (acao === 'exportar-json') exportarJSON(chave);
          if (acao === 'limpar' && confirm('Apagar TODOS os registros desta lista?')) {
            Store.limpar(chave);
            document.querySelectorAll('table[data-chave="' + chave + '"]').forEach(desenharTabela);
          }
        });
      });
    }
  
    /* ---------------------------------------------------------
       INICIALIZAÇÃO
       --------------------------------------------------------- */
    function iniciar() {
      iniciarAcessibilidade();
      FORMULARIOS.forEach(iniciarFormulario);
      iniciarPainel();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciar);
    } else {
      iniciar();
    }
  })();