
const form = document.getElementsByClassName('formulario');
let botao = document.getElementsByClassName('btn-primary');

form.addEventListener('submit', function(event) { 
    console.log("Form carregado!")
    event.preventDefault(); // Impede o envio padrão 
    
    let nome = document.getElementById('nome').value; 
    let sobrenome = document.getElementById('sobrenome').value; 
    let tipoCandidatura = document.getElementByNome(tipo)
    let email = document.getElementById('email').value; 
    let valido = true; 
    
    console.log(nome);
    console.log(sobrenome);
    console.log(tipoCandidatura);

    // Limpar mensagens de erro 
    //document.getElementById('erroNome').innerText = ""; 
    //document.getElementById('erroEmail').innerText = ""; 
            
    // Validação do Nome 
    if (nome.trim() === "") { 
        document.getElementById('erroNome').innerText = "O nome é obrigatório"; 
        valido = false; 
    } 
            
    // Validação do Email (simples) 
    if (!email.includes("@") || !email.includes(".")) { 
        document.getElementById('erroEmail').innerText = "Email inválido."; 
        valido = false; 
    } 
            
    if (valido) { 
        alert("Formulário enviado com sucesso!"); 
        console.log(form.nome, form.sobrenome, form.email)
//        form.reset(); // Limpa o formulário 
    } 

}); 