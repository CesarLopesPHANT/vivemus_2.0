# Politica de Privacidade — Vivemus

**Ultima atualizacao:** 20 de fevereiro de 2026

A Vivemus Tecnologia em Saude Ltda. ("Vivemus", "nos") opera a plataforma Vivemus de teleconsulta medica. Esta Politica de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Protecao de Dados (LGPD — Lei 13.709/2018).

---

## 1. Dados Coletados

### 1.1 Dados Cadastrais
- Nome completo, CPF, data de nascimento, e-mail, telefone celular.
- Tipo de plano (Individual PF ou Empresarial PJ).
- Dados de dependentes, quando cadastrados.

### 1.2 Dados Sensiveis de Saude (Art. 11, LGPD)
- Historico de teleconsultas (data, duracao, especialidade, nome do medico).
- Prontuarios medicos eletronicos gerados durante as consultas.
- Receitas, atestados e laudos emitidos pelos profissionais de saude.
- Dados de triagem e queixas relatadas pelo paciente.

### 1.3 Dados Tecnicos
- Endereco IP, user-agent do navegador/dispositivo.
- Registros de acesso e logs de auditoria (Art. 37, LGPD).
- Dados de consentimento (data, hora, versao do termo aceito).

---

## 2. Base Legal para o Tratamento (Art. 7 e Art. 11, LGPD)

| Finalidade | Base Legal |
|---|---|
| Prestacao do servico de teleconsulta | Execucao de contrato (Art. 7, V) |
| Tratamento de dados de saude | Tutela da saude em procedimento por profissional de saude (Art. 11, II, f) |
| Retencao de prontuarios por 20 anos | Cumprimento de obrigacao legal — CFM (Art. 7, II) |
| Logs de acesso e auditoria | Cumprimento de obrigacao legal — Marco Civil da Internet (Art. 7, II) |
| Envio de notificacoes sobre consultas | Consentimento do titular (Art. 7, I) |
| Analytics e melhoria do servico | Interesse legitimo do controlador (Art. 7, IX) |

---

## 3. Parceria com a Doutor ao Vivo

A Vivemus utiliza a plataforma **Doutor ao Vivo (DAV)** como operadora de telemedicina para a realizacao das teleconsultas. Nesse contexto:

- Seus dados cadastrais (nome, CPF, e-mail) sao compartilhados com a DAV exclusivamente para viabilizar o acesso a sala de teleconsulta via Single Sign-On (PSO).
- A DAV atua como **operadora** dos dados no ambito da teleconsulta, conforme contrato de processamento de dados firmado entre as partes.
- Os dados de saude gerados durante a consulta (prontuarios, receitas, atestados) sao armazenados tanto na plataforma DAV quanto na Vivemus, para garantir continuidade do cuidado.
- A DAV segue suas proprias politicas de privacidade, disponiveis em seu site oficial.

---

## 4. Armazenamento e Seguranca

- Os dados sao armazenados em servidores seguros com criptografia em transito (TLS 1.3) e em repouso.
- O acesso ao banco de dados e restrito por politicas de Row Level Security (RLS), garantindo que cada usuario acesse apenas seus proprios dados.
- Chaves de API e credenciais sao armazenadas em cofre criptografado (Supabase Vault), nunca expostas ao frontend.
- O aplicativo mobile bloqueia trafego HTTP nao criptografado (cleartext) e restringe conexoes apenas aos dominios autorizados.
- Capturas de tela sao bloqueadas automaticamente durante teleconsultas e visualizacao de prontuarios.

---

## 5. Retencao de Dados

| Tipo de Dado | Prazo de Retencao | Fundamentacao |
|---|---|---|
| Prontuarios medicos | 20 anos apos ultimo atendimento | Resolucao CFM 1.821/2007, Art. 8 |
| Receitas e atestados | 20 anos | Resolucao CFM 1.821/2007 |
| Dados cadastrais | Enquanto a conta estiver ativa | LGPD, Art. 16 |
| Logs de acesso | 6 meses | Marco Civil da Internet, Art. 15 |
| Registros de consentimento | Indeterminado (prova de conformidade) | LGPD, Art. 8, § 2 |

---

## 6. Direitos do Titular (Art. 18, LGPD)

Voce tem direito a:

1. **Confirmacao e acesso** — saber se tratamos seus dados e obter copia.
2. **Correcao** — atualizar dados incompletos, inexatos ou desatualizados.
3. **Anonimizacao, bloqueio ou eliminacao** — de dados desnecessarios ou tratados em desconformidade.
4. **Portabilidade** — receber seus dados em formato estruturado para transferencia a outro prestador.
5. **Eliminacao** — solicitar a exclusao de dados pessoais tratados com base no consentimento.
6. **Revogacao do consentimento** — a qualquer momento, sem retroatividade.

**Importante:** A exclusao da conta anonimiza seus dados pessoais, porem os prontuarios medicos sao retidos por 20 anos conforme obrigacao legal do CFM. Durante esse periodo, os prontuarios permanecem anonimizados e inacessiveis a terceiros.

Para exercer seus direitos, utilize o botao "Excluir minha conta e dados" no seu Perfil ou entre em contato pelo e-mail abaixo.

---

## 7. Cookies e Tecnologias de Rastreamento

A versao web da Vivemus pode utilizar:
- **Cookies essenciais** — para manter sua sessao autenticada.
- **Armazenamento local (localStorage)** — para preferencias de interface.

Nao utilizamos cookies de terceiros para publicidade. Nao vendemos nem compartilhamos dados com plataformas de anuncios.

---

## 8. Transferencia Internacional de Dados

Os dados podem ser processados em servidores localizados fora do Brasil (infraestrutura cloud). Nesses casos, garantimos que o nivel de protecao seja equivalente ao exigido pela LGPD, por meio de clausulas contratuais padrao e certificacoes de seguranca do provedor.

---

## 9. Encarregado de Dados (DPO)

Para duvidas, solicitacoes ou reclamacoes relacionadas ao tratamento de seus dados pessoais:

- **E-mail:** privacidade@vivemus.com.br
- **Responsavel:** Encarregado de Protecao de Dados — Vivemus Tecnologia em Saude Ltda.

Voce tambem pode apresentar reclamacao a Autoridade Nacional de Protecao de Dados (ANPD) em [www.gov.br/anpd](https://www.gov.br/anpd).

---

## 10. Alteracoes nesta Politica

Esta politica pode ser atualizada periodicamente. Alteracoes significativas serao comunicadas por notificacao no aplicativo ou por e-mail. A versao atualizada estara sempre disponivel nesta pagina.

---

**Vivemus Tecnologia em Saude Ltda.**
CNPJ: [A ser preenchido]
