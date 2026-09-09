let selectedRole = 'aluno';
const ADMIN_PASSWORD = 'admin';

function selectRole(role) {
    selectedRole = role;
    const btnAluno = document.getElementById('btnAluno');
    const btnAdmin = document.getElementById('btnAdmin');
    const passwordGroup = document.getElementById('passwordGroup');
    const errorMsg = document.getElementById('loginError');

    if (errorMsg) errorMsg.innerText = '';

    if (role === 'admin') {
        btnAdmin.classList.add('active');
        btnAluno.classList.remove('active');
        passwordGroup.style.display = 'block';
    } else {
        btnAluno.classList.add('active');
        btnAdmin.classList.remove('active');
        passwordGroup.style.display = 'none';
    }
}

function handleLogin(event) {
    if (event) event.preventDefault();

    const passwordInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (selectedRole === 'admin') {
        if (passwordInput === ADMIN_PASSWORD) {
            // Marca a sessão atual como autenticada
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('currentUserRole', 'admin');
            window.location.href = 'index.html';
        } else {
            if (errorMsg) errorMsg.innerText = 'Senha incorreta!';
        }
    } else {
        // Marca a sessão atual como autenticada
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('currentUserRole', 'aluno');
        window.location.href = 'index.html';
    }

    return false;
}
