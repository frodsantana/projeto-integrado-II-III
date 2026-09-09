// 1. VERIFICAÇÃO IMEDIATA AO CARREGAR
// Se o usuário tentar abrir o index.html sem passar pelo login, é redirecionado instantaneamente
(function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
        window.location.href = 'login.html';
    }
})();

function getCurrentUserRole() {
    return sessionStorage.getItem('currentUserRole');
}

function updateRoleUI() {
    const roleBadge = document.getElementById('roleBadge');
    const currentUser = getCurrentUserRole();

    if (currentUser === 'admin') {
        document.body.className = 'is-admin';
        if (roleBadge) {
            roleBadge.className = 'badge badge-admin';
            roleBadge.innerText = 'Administrador (Edição Liberada)';
        }
    } else {
        document.body.className = 'is-aluno';
        if (roleBadge) {
            roleBadge.className = 'badge badge-aluno';
            roleBadge.innerText = 'Aluno (Apenas Leitura)';
        }
    }
}

function logout() {
    // Limpa a sessão e força retorno para o login
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('currentUserRole');
    window.location.href = 'login.html';
}

function toggleRoom(element) {
    const currentUser = getCurrentUserRole();

    if (currentUser !== 'admin') {
        showToast("Acesso restrito: Apenas administradores podem editar.");
        return;
    }

    const isOcupada = element.classList.contains('ocupada');
    const obsElement = element.querySelector('.room-obs');

    if (isOcupada) {
        element.classList.remove('ocupada');
        obsElement.innerText = "Livre";
    } else {
        let aula = prompt("Qual aula / evento está acontecendo nesta sala?");
        if (aula !== null && aula.trim() !== "") {
            element.classList.add('ocupada');
            obsElement.innerText = aula;
        }
    }
    saveState();
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// Salva o estado das salas (verde/livre e observação) no localStorage
function saveState() {
    const roomsData = {};
    document.querySelectorAll('.room').forEach(room => {
        const id = room.getAttribute('data-id');
        const isOcupada = room.classList.contains('ocupada');
        const obs = room.querySelector('.room-obs').innerText;
        roomsData[id] = { isOcupada, obs };
    });
    localStorage.setItem('campus_rooms_state', JSON.stringify(roomsData));
}

// Carrega o estado das salas
function loadState() {
    const savedState = localStorage.getItem('campus_rooms_state');
    if (!savedState) return;

    try {
        const roomsData = JSON.parse(savedState);
        document.querySelectorAll('.room').forEach(room => {
            const id = room.getAttribute('data-id');
            if (roomsData[id]) {
                const obsElement = room.querySelector('.room-obs');
                if (roomsData[id].isOcupada) {
                    room.classList.add('ocupada');
                } else {
                    room.classList.remove('ocupada');
                }
                if (obsElement) {
                    obsElement.innerText = roomsData[id].obs;
                }
            }
        });
    } catch (e) {
        console.error("Erro ao carregar estado das salas:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateRoleUI();
    loadState();
});
