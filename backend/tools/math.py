"""
Math expression evaluation tool
"""
import ast
import operator
from typing import Dict, Any
from . import Tool


class MathTool(Tool):
    """Safe math expression evaluator"""
    
    # Allowed operators for safe evaluation
    ALLOWED_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.Mod: operator.mod,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    
    # Allowed functions
    ALLOWED_FUNCTIONS = {
        'abs': abs,
        'round': round,
        'min': min,
        'max': max,
        'sum': sum,
        'len': len,
    }
    
    async def execute(self, expression: str, **params) -> Dict[str, Any]:
        """
        Safely evaluate a mathematical expression
        
        Args:
            expression: Mathematical expression to evaluate
            
        Returns:
            Dict containing the result or error
        """
        try:
            # Parse the expression into an AST
            node = ast.parse(expression, mode='eval')
            
            # Evaluate the AST safely
            result = self._eval_node(node.body)
            
            return {
                "expression": expression,
                "result": result,
                "type": type(result).__name__
            }
            
        except (ValueError, TypeError, ZeroDivisionError) as e:
            return {
                "expression": expression,
                "error": f"Math error: {str(e)}",
                "result": None
            }
        except Exception as e:
            return {
                "expression": expression,
                "error": f"Invalid expression: {str(e)}",
                "result": None
            }
    
    def _eval_node(self, node):
        """Recursively evaluate an AST node"""
        if isinstance(node, ast.Constant):  # Python 3.8+
            return node.value
        elif isinstance(node, ast.Num):  # Python < 3.8 compatibility
            return node.n
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op_type = type(node.op)
            if op_type in self.ALLOWED_OPERATORS:
                return self.ALLOWED_OPERATORS[op_type](left, right)
            else:
                raise ValueError(f"Operator {op_type.__name__} not allowed")
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            op_type = type(node.op)
            if op_type in self.ALLOWED_OPERATORS:
                return self.ALLOWED_OPERATORS[op_type](operand)
            else:
                raise ValueError(f"Unary operator {op_type.__name__} not allowed")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in self.ALLOWED_FUNCTIONS:
                args = [self._eval_node(arg) for arg in node.args]
                return self.ALLOWED_FUNCTIONS[node.func.id](*args)
            else:
                raise ValueError(f"Function {node.func.id if isinstance(node.func, ast.Name) else 'unknown'} not allowed")
        elif isinstance(node, ast.List):
            return [self._eval_node(elem) for elem in node.elts]
        elif isinstance(node, ast.Tuple):
            return tuple(self._eval_node(elem) for elem in node.elts)
        else:
            raise ValueError(f"Node type {type(node).__name__} not allowed")