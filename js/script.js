const form = document.getElementById('meuForm'); 
     
form.addEventListener('submit', function(event) { 
    event.preventDefault(); // Impede o envio padrão 
    
    let nome = document.getElementById('nome').value; 
    let sobrenome = document.getElementById('sobrenome').value; 
    let tipoCandidatura = document.getElementByName('tipo').value;
    let email = document.getElementById('email').value; 
    let valido = true; 
            
    // Limpar mensagens de erro 
    document.getElementById('erroNome').innerText = ""; 
    document.getElementById('erroEmail').innerText = ""; 
            
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
        // Aqui você poderia enviar os dados para um servidor PHP, por exemplo. 
        form.reset(); // Limpa o formulário 
    } 

}); 