# LLM Evaluation Rubric

## Overview
This rubric is used to evaluate LLM responses across multiple dimensions. Each dimension is scored on a scale of 0-1, with the final score being a weighted average.

## Scoring Dimensions

### 1. Correctness (Weight: 40%)
- **1.0**: Answer is completely correct and addresses all aspects of the question
- **0.8**: Answer is mostly correct with minor inaccuracies
- **0.6**: Answer is partially correct but missing key elements
- **0.4**: Answer has significant errors but shows some understanding
- **0.2**: Answer is mostly incorrect but has minimal relevant content
- **0.0**: Answer is completely incorrect or irrelevant

### 2. Clarity (Weight: 20%)
- **1.0**: Response is exceptionally clear, well-structured, and easy to understand
- **0.8**: Response is clear with good structure
- **0.6**: Response is mostly clear but has some confusing elements
- **0.4**: Response lacks clarity in several areas
- **0.2**: Response is difficult to understand
- **0.0**: Response is incomprehensible or incoherent

### 3. Completeness (Weight: 20%)
- **1.0**: Response fully addresses all aspects of the prompt
- **0.8**: Response addresses most aspects with minor omissions
- **0.6**: Response addresses the main points but misses some details
- **0.4**: Response is incomplete, missing significant elements
- **0.2**: Response barely addresses the prompt
- **0.0**: Response does not address the prompt at all

### 4. Citation Quality (Weight: 10%)
- **1.0**: Provides accurate, relevant citations or acknowledges when information is uncertain
- **0.8**: Good citation practices with minor issues
- **0.6**: Some citations or acknowledgments of uncertainty
- **0.4**: Minimal citation effort
- **0.2**: Poor citation practices or unsubstantiated claims
- **0.0**: Makes false claims or provides misinformation without acknowledgment

### 5. Chain-of-Thought (Weight: 10%)
- **1.0**: Demonstrates excellent reasoning with clear logical steps
- **0.8**: Good reasoning process with mostly clear steps
- **0.6**: Adequate reasoning but some logical jumps
- **0.4**: Weak reasoning with unclear connections
- **0.2**: Minimal reasoning shown
- **0.0**: No logical reasoning apparent

## Special Considerations

### Tool Use
- Appropriate tool use adds bonus points (up to +0.1)
- Excessive or unnecessary tool use results in penalty (up to -0.1)
- Tool errors should not heavily penalize if recovery attempt was made

### Category-Specific Adjustments
- **Math**: Emphasize correctness (50%) and chain-of-thought (20%)
- **Code**: Emphasize correctness (45%) and completeness (25%)
- **Creative**: Reduce correctness weight (20%), increase clarity (30%) and originality
- **Factual**: Emphasize correctness (50%) and citation quality (20%)

## Final Score Calculation
```
final_score = (correctness * 0.4) + (clarity * 0.2) + (completeness * 0.2) + 
              (citation * 0.1) + (chain_of_thought * 0.1) + tool_bonus
```

## Pass/Fail Threshold
- **Pass**: final_score >= 0.7
- **Fail**: final_score < 0.7