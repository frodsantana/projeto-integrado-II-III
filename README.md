### 📌 PROJETO INTEGRADO II - III
Mapa Interativo de Salas do Campus (Sistema de Organização Acadêmica)

### 🎯 OBJETIVO
Auxiliar alunos e professores na visualização e organização do uso de salas de aula e laboratórios de uma faculdade em tempo real. O sistema permite verificar a disponibilidade de cada espaço e qual disciplina/evento está ocorrendo no local.

---

### 🛠️ TECNOLOGIAS E ARQUITETURA
- **Frontend Puro (Vanilla Web):** HTML5, CSS3 e JavaScript ES6+ (Sem frameworks como React ou Vue).
- **Separação de Arquivos:**
  - `login.html`: Tela inicial de autenticação de usuários.
  - `login.js`: Lógica do formulário de login e seleção de perfis.
  - `index.html`: Dashboard principal com o mapa de salas e navegação por andares.
  - `script.js`: Lógica do mapa, manipulação do DOM, controle de sessão e persistência.
  - `style.css`: Estilização unificada para o login e a dashboard.

---

### 🏢 ESTRUTURA DO CAMPUS (3º Andar ao Térreo + Labs)
O campus possui a seguinte divisão física mapeada no sistema:
1. **3º Andar:** 12 salas de aula (Salas 301 a 312).
2. **2º Andar:** 12 salas de aula (Salas 201 a 212).
3. **1º Andar:** 12 salas de aula (Salas 101 a 112).
4. **Laboratórios Especializados:** 7 laboratórios (Lab Info 1, Lab Info 2, Lab Info 3, Lab Química, Lab Física, Lab Biologia, Lab Robótica).

---

### 👥 PERFIS DE USUÁRIO E REGRAS DE NEGÓCIO

1. **Aluno (Modo Leitura):**
   - Não exige senha para logar.
   - Pode navegar por todos os andares e laboratórios.
   - Pode visualizar o status da sala (Livre em cinza, Ocupada em verde com o nome da aula/evento).
   - **Bloqueio:** Se tentar clicar em uma sala para alterar o status, recebe um alerta em tela (Toast notification) informando que não tem permissão.

2. **Administrador (Modo Edição):**
   - Exige senha de validação (padrão: `admin`).
   - Pode clicar nas salas:
     - Se a sala estiver **Livre**, abre um modal/prompt pedindo o nome da aula/evento. Ao confirmar, a sala fica **Verde** e exibe a informação.
     - Se a sala estiver **Ocupada**, ao clicar novamente a sala é liberada e volta ao status "Livre".
