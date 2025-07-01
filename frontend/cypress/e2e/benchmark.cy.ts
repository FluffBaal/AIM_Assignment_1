describe('Benchmark UI', () => {
  beforeEach(() => {
    // Mock the benchmark API endpoint
    cy.intercept('POST', 'http://localhost:8000/api/benchmark', {
      headers: {
        'content-type': 'application/x-ndjson',
      },
      body: [
        {
          timestamp: new Date().toISOString(),
          event_type: 'answer',
          prompt_id: '1',
          prompt_hash: 'abc123',
          content: '4',
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          latency_ms: 250,
          tokens_used: 1
        },
        {
          timestamp: new Date().toISOString(),
          event_type: 'eval',
          prompt_id: '1',
          result: {
            prompt_id: '1',
            score: 1.0,
            passed: true,
            details: { length: 1 }
          }
        },
        {
          timestamp: new Date().toISOString(),
          event_type: 'answer',
          prompt_id: '2',
          prompt_hash: 'def456',
          content: 'Quantum computing uses quantum mechanics principles like superposition and entanglement to process information in ways classical computers cannot.',
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          latency_ms: 850,
          tokens_used: 25
        },
        {
          timestamp: new Date().toISOString(),
          event_type: 'tool',
          prompt_id: '2',
          tool_name: 'search',
          tool_args: { query: 'quantum computing basics' },
          tool_result: { found: true }
        },
        {
          timestamp: new Date().toISOString(),
          event_type: 'eval',
          prompt_id: '2',
          result: {
            prompt_id: '2',
            score: 0.9,
            passed: true,
            details: { length: 120 }
          }
        },
        {
          timestamp: new Date().toISOString(),
          event_type: 'summary',
          total_prompts: 2,
          passed: 2,
          failed: 0,
          average_score: 0.95,
          total_duration_ms: 1100,
          errors: []
        }
      ].map(event => JSON.stringify(event)).join('\\n')
    }).as('benchmarkRequest');

    cy.visit('/benchmark');
  });

  it('should display benchmark configuration panel', () => {
    cy.contains('h2', 'Benchmark Configuration').should('be.visible');
    cy.get('label').contains('Provider').should('be.visible');
    cy.get('label').contains('Model').should('be.visible');
    cy.get('label').contains('Prompts').should('be.visible');
  });

  it('should run benchmark and display results', () => {
    // Enter prompts
    cy.get('textarea').clear().type('What is 2+2?\\nExplain quantum computing');
    
    // Select provider and model
    cy.get('[id="provider"]').click();
    cy.get('[role="option"]').contains('OpenAI').click();
    
    cy.get('[id="model"]').click();
    cy.get('[role="option"]').contains('GPT-3.5 Turbo').click();
    
    // Run benchmark
    cy.contains('button', 'Run Benchmark').click();
    
    // Wait for the request
    cy.wait('@benchmarkRequest');
    
    // Check results are displayed
    cy.contains('h2', 'Results').should('be.visible');
    
    // Verify summary card
    cy.contains('Total Prompts').parent().contains('2');
    cy.contains('Passed').parent().contains('2');
    cy.contains('Failed').parent().contains('0');
    cy.contains('Avg Score').parent().contains('95%');
    
    // Verify results table has rows
    cy.get('table tbody tr').should('have.length', 2);
    
    // First row
    cy.get('table tbody tr').first().within(() => {
      cy.contains('What is 2+2?');
      cy.contains('100%');
      cy.contains('250ms');
    });
    
    // Second row  
    cy.get('table tbody tr').last().within(() => {
      cy.contains('Explain quantum computing');
      cy.contains('90%');
      cy.contains('850ms');
    });
  });

  it('should toggle chain of thought display', () => {
    // Run benchmark first
    cy.get('textarea').clear().type('Test prompt');
    cy.contains('button', 'Run Benchmark').click();
    cy.wait('@benchmarkRequest');
    
    // Initially CoT should be hidden
    cy.get('table thead th').should('not.contain', 'Answer');
    
    // Toggle CoT
    cy.contains('Show Chain of Thought').click();
    
    // Now Answer column should be visible
    cy.get('table thead th').contains('Answer');
    
    // Toggle back
    cy.contains('Hide Chain of Thought').click();
    cy.get('table thead th').should('not.contain', 'Answer');
  });

  it('should display tool logs', () => {
    // Run benchmark
    cy.get('textarea').clear().type('What is 2+2?\\nExplain quantum computing');
    cy.contains('button', 'Run Benchmark').click();
    cy.wait('@benchmarkRequest');
    
    // Open tool log drawer
    cy.contains('button', 'Tool Logs (1)').click();
    
    // Check drawer content
    cy.contains('Tool Call Logs').should('be.visible');
    cy.contains('search').should('be.visible');
    cy.contains('quantum computing basics').should('be.visible');
  });

  it('should display sparkline for multiple results', () => {
    // Run benchmark
    cy.get('textarea').clear().type('What is 2+2?\\nExplain quantum computing');
    cy.contains('button', 'Run Benchmark').click();
    cy.wait('@benchmarkRequest');
    
    // Check sparkline is rendered
    cy.contains('Score Trend').should('be.visible');
    cy.get('canvas').should('be.visible'); // Chart.js renders to canvas
  });

  it('should handle errors gracefully', () => {
    // Mock error response
    cy.intercept('POST', 'http://localhost:8000/api/benchmark', {
      statusCode: 500,
      body: { detail: 'API key not configured' }
    }).as('benchmarkError');
    
    // Run benchmark
    cy.get('textarea').clear().type('Test prompt');
    cy.contains('button', 'Run Benchmark').click();
    cy.wait('@benchmarkError');
    
    // Check error is displayed
    cy.contains('Error:').should('be.visible');
  });

  it('should reset state', () => {
    // Run benchmark
    cy.get('textarea').clear().type('Test prompt');
    cy.contains('button', 'Run Benchmark').click();
    cy.wait('@benchmarkRequest');
    
    // Results should be visible
    cy.get('table tbody tr').should('exist');
    
    // Click reset
    cy.get('button[aria-label*="reset" i], button').find('svg').parent().click();
    
    // Results should be cleared
    cy.contains('No results yet').should('be.visible');
  });
});