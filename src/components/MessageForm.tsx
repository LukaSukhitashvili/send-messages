'use client'

import { useState } from 'react'

export default function MessageForm() {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = 10 - images.length
    const newFiles = files.slice(0, remainingSlots)
    setImages([...images, ...newFiles])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('username', username.trim())
    formData.append('message', message.trim())
    images.forEach((image) => formData.append('images', image))

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setUsername('')
        setMessage('')
        setImages([])
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Failed to submit')
        setTimeout(() => setStatus('idle'), 5000)
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please try again.')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    const remainingSlots = 10 - images.length
    const newFiles = files.slice(0, remainingSlots)
    setImages([...images, ...newFiles])
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          placeholder="Enter your username"
          disabled={status === 'submitting'}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-y"
          placeholder="Write your message here..."
          disabled={status === 'submitting'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Images (max 10, 5MB each)
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors hover:border-blue-400"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            disabled={status === 'submitting' || images.length >= 10}
          />
          <label
            htmlFor="images"
            className="cursor-pointer block"
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-gray-600">
              <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG, GIF, WebP · Max 5MB each</p>
          </label>
        </div>

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  disabled={status === 'submitting'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {status === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
          ✓ Message sent successfully!
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-center">
          ✕ {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !username.trim() || !message.trim()}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}