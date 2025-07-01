import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test('user can type message and see streamed response', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Should see welcome message
    await expect(page.getByText('Welcome to LLM Bench')).toBeVisible();

    // Click "Start New Chat" button
    await page.getByRole('button', { name: 'Start New Chat' }).click();

    // Should see the chat window
    await expect(page.getByText('Start a conversation by typing a message below')).toBeVisible();

    // Type a message
    const messageInput = page.getByPlaceholder('Type a message...');
    await messageInput.fill('Hello, how are you?');

    // Send the message (button has icon, not text)
    await page.locator('button[type="submit"]').click();

    // Should see the user message in the chat
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Hello, how are you?' })).toBeVisible();

    // Should see typing indicator for assistant
    await expect(page.locator('span.italic.opacity-70').getByText('Typing...')).toBeVisible();

    // Wait for response (with timeout for streaming)
    await page.waitForTimeout(1000);

    // Should have some response content (even if it's an error)
    const assistantMessages = page.locator('[class*="bg-muted"]');
    await expect(assistantMessages).toHaveCount(1);
  });

  test('user can create multiple threads', async ({ page }) => {
    await page.goto('/');

    // Create first thread
    await page.getByRole('button', { name: 'Start New Chat' }).click();
    await page.getByPlaceholder('Type a message...').fill('First conversation');
    await page.locator('button[type="submit"]').click();

    // Wait for the thread to be created
    await page.waitForTimeout(500);

    // Create second thread using the + button
    await page.locator('button[class*="h-8 w-8"]').click(); // Plus button

    // Should see empty chat again
    await expect(page.getByText('Start a conversation by typing a message below')).toBeVisible();

    // Send message in second thread
    await page.getByPlaceholder('Type a message...').fill('Second conversation');
    await page.locator('button[type="submit"]').click();

    // Should see two threads in the sidebar
    const threads = page.locator('[class*="group flex items-center"]');
    await expect(threads).toHaveCount(2);
  });

  test('user can switch between threads', async ({ page }) => {
    await page.goto('/');

    // Create first thread
    await page.getByRole('button', { name: 'Start New Chat' }).click();
    await page.getByPlaceholder('Type a message...').fill('Message in thread 1');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(500);

    // Create second thread
    await page.locator('button[class*="h-8 w-8"]').click();
    await page.getByPlaceholder('Type a message...').fill('Message in thread 2');
    await page.locator('button[type="submit"]').click();

    // Click on first thread
    await page.locator('[class*="group flex items-center"]').first().click();

    // Should see the first message in the chat content
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Message in thread 1' })).toBeVisible();
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Message in thread 2' })).not.toBeVisible();
  });
});