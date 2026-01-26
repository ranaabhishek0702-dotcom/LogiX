//State Management
const state = {
    propositions: {},
    propositionOrder: [],
    currentExpression: ''
};

//DOM
const elements = {
    addPropositionBtn: document.getElementById('add-proposition-btn'),
    propositionsContainer: document.getElementById('propositions-container'),
    expressionInput: document.getElementById('expression-input'),
    expressionFeedback: document.getElementById('expression-feedback'),
    evaluateBtn: document.getElementById('evaluate-btn'),
    truthTableBtn: document.getElementById('truth-table-btn'),
    clearBtn: document.getElementById('clear-btn'),
    resultsSection: document.getElementById('results-section'),
    resultsContainer: document.getElementById('results-container'),
    truthTableSection: document.getElementById('truth-table-section'),
    truthTableContainer: document.getElementById('truth-table-container')
};

//Proposition Management 
let propositionCounter = 0;
const propositionNames = ['p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

function addProposition() {
    if (propositionCounter >= propositionNames.length) {
        alert('Maximum number of propositions reached!');
        return;
    }
    
    const name = propositionNames[propositionCounter];
    propositionCounter++;
    
    state.propositions[name] = true; 
    state.propositionOrder.push(name);
    
    renderProposition(name);
}

function removeProposition(name) {
    delete state.propositions[name];
    state.propositionOrder = state.propositionOrder.filter(p => p !== name);
    
    const card = document.querySelector(`[data-proposition="${name}"]`);
    if (card) {
        card.style.animation = 'scaleOut 0.3s ease';
        setTimeout(() => card.remove(), 300);
    }
    

    if (state.propositionOrder.length === 0) {
        propositionCounter = 0;
    }
}

function renderProposition(name) {
    const card = document.createElement('div');
    card.className = 'proposition-card';
    card.setAttribute('data-proposition', name);
    
    card.innerHTML = `
        <div class="proposition-header">
            <span class="proposition-name">${name}</span>
            <button class="btn btn-danger" onclick="removeProposition('${name}')">
                <span class="btn-icon">×</span>
            </button>
        </div>
        <div class="proposition-value">
            <div class="value-option ${state.propositions[name] ? 'active-true' : ''}" 
                 onclick="setPropositionValue('${name}', true)">
                True
            </div>
            <div class="value-option ${!state.propositions[name] ? 'active-false' : ''}" 
                 onclick="setPropositionValue('${name}', false)">
                False
            </div>
        </div>
    `;
    
    elements.propositionsContainer.appendChild(card);
}

function setPropositionValue(name, value) {
    state.propositions[name] = value;
    
    const card = document.querySelector(`[data-proposition="${name}"]`);
    const options = card.querySelectorAll('.value-option');
    
    options.forEach(option => {
        option.classList.remove('active-true', 'active-false');
    });
    
    if (value) {
        options[0].classList.add('active-true');
    } else {
        options[1].classList.add('active-false');
    }
    
    // Re-validate expression if exists
    if (state.currentExpression) {
        validateExpression(state.currentExpression);
    }
}

//  Expression Parser 
function tokenize(expression) {
    // Normalize operators
    expression = expression.trim()
        .replace(/∧/g, 'AND')
        .replace(/∨/g, 'OR')
        .replace(/¬/g, 'NOT')
        .replace(/→/g, 'IMPLIES')
        .replace(/↔/g, 'IFF');
    
    // Tokenize
    const tokens = [];
    const regex = /\s*(AND|OR|NOT|IMPLIES|IFF|\(|\)|[a-z])\s*/gi;
    let match;
    
    while ((match = regex.exec(expression)) !== null) {
        const token = match[1].trim();
        if (token) tokens.push(token);
    }
    
    return tokens;
}

function validateExpression(expression) {
    if (!expression.trim()) {
        elements.expressionFeedback.className = 'expression-feedback';
        elements.expressionFeedback.textContent = '';
        return { valid: false, error: 'Expression is empty' };
    }
    
    try {
        const tokens = tokenize(expression);
        
        // Check for unknown propositions
        const usedPropositions = tokens.filter(t => 
            /^[a-z]$/i.test(t) && !['AND', 'OR', 'NOT', 'IMPLIES', 'IFF'].includes(t.toUpperCase())
        );
        
        const unknownProps = usedPropositions.filter(p => !(p in state.propositions));
        
        if (unknownProps.length > 0) {
            elements.expressionFeedback.className = 'expression-feedback invalid';
            elements.expressionFeedback.textContent = `⚠ Undefined propositions: ${unknownProps.join(', ')}. Please add them first.`;
            return { valid: false, error: `Undefined propositions: ${unknownProps.join(', ')}` };
        }
        
        // Basic syntax validation
        const parsed = parseExpression(tokens);
        
        elements.expressionFeedback.className = 'expression-feedback valid';
        elements.expressionFeedback.textContent = '✓ Valid expression';
        return { valid: true };
        
    } catch (error) {
        elements.expressionFeedback.className = 'expression-feedback invalid';
        elements.expressionFeedback.textContent = `⚠ ${error.message}`;
        return { valid: false, error: error.message };
    }
}

function parseExpression(tokens) {
    let index = 0;
    
    function parseOr() {
        let left = parseAnd();
        
        while (index < tokens.length && tokens[index].toUpperCase() === 'OR') {
            index++;
            const right = parseAnd();
            left = { type: 'OR', left, right };
        }
        
        return left;
    }
    
    function parseAnd() {
        let left = parseImplies();
        
        while (index < tokens.length && tokens[index].toUpperCase() === 'AND') {
            index++;
            const right = parseImplies();
            left = { type: 'AND', left, right };
        }
        
        return left;
    }
    
    function parseImplies() {
        let left = parseIff();
        
        while (index < tokens.length && tokens[index].toUpperCase() === 'IMPLIES') {
            index++;
            const right = parseIff();
            left = { type: 'IMPLIES', left, right };
        }
        
        return left;
    }
    
    function parseIff() {
        let left = parseNot();
        
        while (index < tokens.length && tokens[index].toUpperCase() === 'IFF') {
            index++;
            const right = parseNot();
            left = { type: 'IFF', left, right };
        }
        
        return left;
    }
    
    function parseNot() {
        if (index < tokens.length && tokens[index].toUpperCase() === 'NOT') {
            index++;
            return { type: 'NOT', operand: parseNot() };
        }
        
        return parsePrimary();
    }
    
    function parsePrimary() {
        if (index >= tokens.length) {
            throw new Error('Unexpected end of expression');
        }
        
        const token = tokens[index];
        
        if (token === '(') {
            index++;
            const expr = parseOr();
            if (index >= tokens.length || tokens[index] !== ')') {
                throw new Error('Missing closing parenthesis');
            }
            index++;
            return expr;
        }
        
        if (/^[a-z]$/i.test(token)) {
            index++;
            return { type: 'PROP', name: token };
        }
        
        throw new Error(`Unexpected token: ${token}`);
    }
    
    const result = parseOr();
    
    if (index < tokens.length) {
        throw new Error(`Unexpected token: ${tokens[index]}`);
    }
    
    return result;
}

function evaluateAST(ast, values) {
    switch (ast.type) {
        case 'PROP':
            return values[ast.name];
            
        case 'NOT':
            return !evaluateAST(ast.operand, values);
            
        case 'AND':
            return evaluateAST(ast.left, values) && evaluateAST(ast.right, values);
            
        case 'OR':
            return evaluateAST(ast.left, values) || evaluateAST(ast.right, values);
            
        case 'IMPLIES':
            return !evaluateAST(ast.left, values) || evaluateAST(ast.right, values);
            
        case 'IFF':
            return evaluateAST(ast.left, values) === evaluateAST(ast.right, values);
            
        default:
            throw new Error(`Unknown AST node type: ${ast.type}`);
    }
}

// Evaluation
function evaluateExpression() {
    const expression = elements.expressionInput.value;
    
    if (state.propositionOrder.length === 0) {
        alert('Please add at least one proposition first!');
        return;
    }
    
    const validation = validateExpression(expression);
    if (!validation.valid) {
        return;
    }
    
    try {
        const tokens = tokenize(expression);
        const ast = parseExpression(tokens);
        const result = evaluateAST(ast, state.propositions);
        
        displayResult(expression, result);
    } catch (error) {
        alert(`Error evaluating expression: ${error.message}`);
    }
}

function displayResult(expression, result) {
    elements.resultsContainer.innerHTML = `
        <div class="result-value ${result ? 'true' : 'false'}">
            ${result ? 'TRUE' : 'FALSE'}
        </div>
        <div class="result-expression">
            Expression: ${expression}
        </div>
    `;
    
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

//  Truth Table Generation 
function generateTruthTable() {
    const expression = elements.expressionInput.value;
    
    if (state.propositionOrder.length === 0) {
        alert('Please add at least one proposition first!');
        return;
    }
    
    const validation = validateExpression(expression);
    if (!validation.valid) {
        return;
    }
    
    try {
        const tokens = tokenize(expression);
        const ast = parseExpression(tokens);
        
        // Generate all possible combinations
        const props = state.propositionOrder;
        const numRows = Math.pow(2, props.length);
        const rows = [];
        
        for (let i = 0; i < numRows; i++) {
            const values = {};
            for (let j = 0; j < props.length; j++) {
                values[props[j]] = Boolean((i >> (props.length - 1 - j)) & 1);
            }
            const result = evaluateAST(ast, values);
            rows.push({ values, result });
        }
        
        displayTruthTable(props, rows, expression);
    } catch (error) {
        alert(`Error generating truth table: ${error.message}`);
    }
}

function displayTruthTable(props, rows, expression) {
    let tableHTML = '<table class="truth-table"><thead><tr>';
    
    // Header
    props.forEach(prop => {
        tableHTML += `<th>${prop}</th>`;
    });
    tableHTML += `<th class="result-column">Result</th>`;
    tableHTML += '</tr></thead><tbody>';
    
    // Rows
    rows.forEach(row => {
        tableHTML += '<tr>';
        props.forEach(prop => {
            const value = row.values[prop];
            tableHTML += `<td class="${value ? 'true' : 'false'}">${value ? 'T' : 'F'}</td>`;
        });
        tableHTML += `<td class="result-column ${row.result ? 'true' : 'false'}">${row.result ? 'T' : 'F'}</td>`;
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    
    elements.truthTableContainer.innerHTML = tableHTML;
    elements.truthTableSection.style.display = 'block';
    elements.truthTableSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== Clear Function ====================
function clearAll() {
    elements.expressionInput.value = '';
    state.currentExpression = '';
    elements.expressionFeedback.className = 'expression-feedback';
    elements.expressionFeedback.textContent = '';
    elements.resultsSection.style.display = 'none';
    elements.truthTableSection.style.display = 'none';
}


elements.addPropositionBtn.addEventListener('click', addProposition);

elements.evaluateBtn.addEventListener('click', evaluateExpression);

elements.truthTableBtn.addEventListener('click', generateTruthTable);

elements.clearBtn.addEventListener('click', clearAll);

elements.expressionInput.addEventListener('input', (e) => {
    state.currentExpression = e.target.value;
    if (e.target.value.trim()) {
        validateExpression(e.target.value);
    } else {
        elements.expressionFeedback.className = 'expression-feedback';
        elements.expressionFeedback.textContent = '';
    }
});

// Example buttons
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const example = btn.getAttribute('data-example');
        elements.expressionInput.value = example;
        state.currentExpression = example;
        validateExpression(example);
    });
});


function init() {
    // Add some default propositions to get started
    addProposition(); // p
    addProposition(); // q
    addProposition(); // r
    
    console.log('Logical Calculator initialized!');
}

// Initialize on page load
init();