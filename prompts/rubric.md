# LLM Benchmark Evaluation Rubric

This rubric defines the evaluation criteria for the starter test set prompts.

## Scoring Guidelines

Each response is scored on a scale of 0.0 to 1.0:
- **1.0**: Perfect response - accurate, complete, and well-structured
- **0.8-0.9**: Good response - mostly accurate with minor issues
- **0.6-0.7**: Adequate response - correct core content but lacking detail or polish
- **0.4-0.5**: Partial response - some correct elements but significant gaps
- **0.2-0.3**: Poor response - mostly incorrect or severely incomplete
- **0.0-0.1**: Failed response - completely wrong or no meaningful content

## Category-Specific Criteria

### Math (IDs: 1, 5, 10, 20)
- **Correctness**: Is the numerical answer correct?
- **Method**: Is the solution method shown and valid?
- **Clarity**: Are steps explained clearly?

### Coding (IDs: 2, 8, 12, 16)
- **Functionality**: Does the code work correctly?
- **Syntax**: Is the syntax valid for the language?
- **Best Practices**: Does it follow language conventions?
- **Explanation**: Is the code explained adequately?

### Creative (ID: 3)
- **Format**: Does it follow the requested format (haiku: 5-7-5)?
- **Relevance**: Is it about the requested topic?
- **Quality**: Is it creative and well-crafted?

### Knowledge (IDs: 4, 7, 18)
- **Accuracy**: Is the factual information correct?
- **Completeness**: Are all requested items included?
- **Organization**: Is the information well-organized?

### Literature (ID: 6)
- **Accuracy**: Are plot points correct?
- **Completeness**: Are major events covered?
- **Conciseness**: Is it within the requested length?

### AI/Technology (IDs: 9, 19)
- **Technical Accuracy**: Are concepts explained correctly?
- **Clarity**: Are complex ideas made understandable?
- **Depth**: Is appropriate detail provided?

### Science (IDs: 11, 15)
- **Factual Accuracy**: Are scientific facts correct?
- **Explanation Quality**: Is the reasoning clear?
- **Precision**: Are units and values accurate?

### Language (ID: 13)
- **Translation Accuracy**: Is the translation correct?
- **Natural Expression**: Does it sound natural in the target language?

### Economics (ID: 14)
- **Conceptual Understanding**: Are economic principles correct?
- **Examples**: Are relevant examples provided?
- **Clarity**: Is the explanation accessible?

### Reasoning (ID: 17)
- **Argument Structure**: Is the argument logical?
- **Evidence**: Are supporting points valid?
- **Persuasiveness**: Is it convincing?

## Pass/Fail Criteria

A response is considered to **pass** if:
- Score ≥ 0.6 for easy prompts
- Score ≥ 0.5 for medium prompts
- Score ≥ 0.4 for hard prompts

## Special Considerations

1. **Partial Credit**: Award partial points for partially correct answers
2. **Alternative Solutions**: Accept valid alternative approaches
3. **Language Variations**: Accept reasonable variations in natural language responses
4. **Code Style**: Don't penalize for style preferences if code is functional
5. **Cultural Context**: Consider culturally appropriate variations in creative tasks