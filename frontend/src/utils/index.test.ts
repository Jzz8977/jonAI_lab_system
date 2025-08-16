// Tests for utility functions
import { describe, it, expect } from 'vitest'
import { formatDate, truncateText, slugify, formatFileSize, formatNumber } from './index'

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date, 'short')
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it('should format relative dates', () => {
      const today = new Date()
      const result = formatDate(today, 'relative')
      expect(result).toBe('Today')
    })
  })

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated'
      const result = truncateText(text, 20)
      expect(result).toBe('This is a very long...')
    })

    it('should not truncate short text', () => {
      const text = 'Short text'
      const result = truncateText(text, 20)
      expect(result).toBe('Short text')
    })
  })

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      const text = 'Hello World! This is a Test.'
      const result = slugify(text)
      expect(result).toBe('hello-world-this-is-a-test')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
    })
  })

  describe('formatNumber', () => {
    it('should format large numbers', () => {
      expect(formatNumber(1500)).toBe('1.5K')
      expect(formatNumber(1500000)).toBe('1.5M')
      expect(formatNumber(500)).toBe('500')
    })
  })
})