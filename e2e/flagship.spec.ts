import { expect, test } from '@playwright/test'

test('flagship admission journey is understandable through the UI', async ({ page }) => {
  await page.goto('/?demo=1')

  await expect(page.getByText('Tablet · Unassigned')).toBeVisible()
  await expect(page.getByText('WAITING FOR A COLLABORATOR')).toBeVisible()
  await expect(page.getByText('No agent in this workspace')).toBeVisible()

  await page.getByRole('button', { name: 'Simulate admission request' }).click()
  await expect(page.getByText('Your agent wants to join')).toBeVisible()
  await expect(page.getByText('Tablet · Propose')).toBeVisible()
  await expect(page.getByText('Modify Desktop or Mobile')).toBeVisible()

  await page.getByRole('button', { name: 'Admit agent' }).click()
  await expect(page.getByText('Tablet · Your agent')).toBeVisible()
  await expect(page.getByText('YOUR AGENT', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Responsive collaborator', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Simulate Tablet tool calls' }).click()

  const mobileHeadline = page.getByText('Your product team, finally in the same orbit.').last()
  await mobileHeadline.click()
  await expect(page.getByText('Headline', { exact: true }).last()).toBeVisible()
  const propertyPanel = page.getByText('PROPERTIES', { exact: true }).locator('..')
  await propertyPanel.getByRole('button', { name: '+' }).last().click()

  await expect(page.getByText('Project changed. Agent is catching up…')).toBeVisible({ timeout: 5000 })
  const reviewButton = page.getByRole('button', { name: /Review \d+ changes/ })
  await expect(reviewButton).toBeVisible({ timeout: 7000 })

  await reviewButton.click()
  await expect(page.getByText('Changes from your browser agent', { exact: true })).toBeVisible()
  await expect(page.getByText(/provisional changes/)).toBeVisible()
  await page.getByRole('button', { name: 'Accept selected' }).click()

  await expect(page.getByText('Tablet changes accepted')).toBeVisible()
  await page.getByRole('button', { name: 'Remove agent' }).click()
  await expect(page.getByText('Tablet · Unassigned')).toBeVisible()
  await expect(page.getByText('No agent in this workspace')).toBeVisible()
  await expect(page.getByText('YOUR AGENT', { exact: true })).toHaveCount(0)
})
