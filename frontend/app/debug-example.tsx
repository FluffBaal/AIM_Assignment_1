'use client';

export function DebugExample() {
  const handleClick = () => {
    // This will pause execution when DevTools is open
    debugger;
    
    console.log('Before calculation');
    const result = complexCalculation();
    console.log('Result:', result);
  };

  const complexCalculation = () => {
    // Add breakpoint here in VS Code or DevTools
    const values = [1, 2, 3, 4, 5];
    
    // You can inspect variables at runtime
    const sum = values.reduce((acc, val) => {
      debugger; // Pause on each iteration
      return acc + val;
    }, 0);
    
    return sum;
  };

  return (
    <div>
      <button onClick={handleClick}>
        Click to Debug
      </button>
      <p>Open DevTools (F12) before clicking!</p>
    </div>
  );
}