import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src'

function memoryStorage(initial: string | null = null) {
  let token = initial
  return { get: () => token, set: (t: string | null) => void (token = t) }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('client API', () => {
  it('enregistre le jeton à la connexion et l\'envoie ensuite', async () => {
    const storage = memoryStorage()
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'abc', token_type: 'Bearer', expires_at: '', user: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 1 } }))

    const api = createApiClient({ baseUrl: 'https://api.test/api/', storage, fetch })
    await api.auth.login({ email: 'a@b.c', password: 'x' })
    await api.auth.me()

    expect(storage.get()).toBe('abc')
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/auth/login')
    expect(fetch.mock.calls[1]?.[1]?.headers.Authorization).toBe('Bearer abc')
  })

  it('transforme les erreurs de validation en ApiError', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(422, { message: 'Certains champs sont invalides.', errors: { email: ['E-mail déjà utilisé.'] } }),
    )
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const error = await api.users.create({} as never).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.fieldError('email')).toBe('E-mail déjà utilisé.')
  })

  it('efface le jeton et prévient l\'application sur une réponse 401', async () => {
    const storage = memoryStorage('expiré')
    const onUnauthorized = vi.fn()
    const fetch = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage, fetch, onUnauthorized })

    await expect(api.auth.me()).rejects.toBeInstanceOf(ApiError)
    expect(storage.get()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('ajoute les filtres à l\'URL', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: [], meta: {} }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.users.list({ search: 'awa', is_active: true, role: undefined, page: 2 })

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/users?search=awa&is_active=1&page=2')
  })

  it('signale un serveur injoignable', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage(), fetch })

    await expect(api.auth.me()).rejects.toMatchObject({ status: 0 })
  })

  it('envoie les créations de clients avec leur client_uuid et renvoie la fiche', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { data: { id: 7, name: 'Sonatel' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const client = await api.clients.create({ client_uuid: 'u-1', name: 'Sonatel', phones: [{ number: '77' }] })

    expect(client.id).toBe(7)
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/api/v1/clients')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ client_uuid: 'u-1', name: 'Sonatel', phones: [{ number: '77' }] })
  })

  it('filtre les contacts par client et supprime une fiche', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { server_time: 'x' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.contacts.list({ client_id: 3, search: 'diop' })
    await api.contacts.remove(9)

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/contacts?client_id=3&search=diop')
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/contacts/9')
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('DELETE')
  })

  it('récupère toutes les pages d\'une synchro et garde l\'heure serveur de la première page', async () => {
    const page = (n: number, last: number, time: string) =>
      jsonResponse(200, { data: [{ id: n }], meta: { current_page: n, last_page: last, server_time: time } })
    const fetch = vi.fn().mockResolvedValueOnce(page(1, 2, 'T1')).mockResolvedValueOnce(page(2, 2, 'T2'))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const result = await api.syncAll((f) => api.clients.list(f), '2026-11-01T00:00:00+00:00')

    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }], serverTime: 'T1' })
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://api.test/api/v1/clients?updated_since=2026-11-01T00%3A00%3A00%2B00%3A00&page=1&per_page=500',
    )
    expect(fetch.mock.calls[1]?.[0]).toContain('page=2')
  })

  it('fait une synchro complète sans date de dernière synchro', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: [], meta: { current_page: 1, last_page: 1, server_time: 'T' } }),
    )
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.syncAll((f) => api.contacts.list(f), null)

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/contacts?page=1&per_page=500')
  })

  it('envoie le logo en multipart, sans Content-Type JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: 7, logo_url: 'https://x/logo.png' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const client = await api.clients.uploadLogo(7, new Blob(['png'], { type: 'image/png' }), 'logo.png')

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/api/v1/clients/7/logo')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('logo')).toBeInstanceOf(Blob)
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.headers.Authorization).toBe('Bearer t')
    expect(client.logo_url).toBe('https://x/logo.png')
  })

  it('note une demande client et filtre la boîte « À traiter »', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: 3, body: 'Rappeler M. Diop' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { server_time: 'T' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { open: 4, overdue: 1 } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const created = await api.clientRequests.create({ body: 'Rappeler M. Diop', source: 'phone' })
    await api.clientRequests.list({ open: true, assigned: 'me' })
    const summary = await api.clientRequests.summary()

    expect(created.id).toBe(3)
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/client-requests')
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/client-requests?open=1&assigned=me')
    expect(summary.open).toBe(4)
  })

  it('lit les notifications et les marque comme lues', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { unread_count: 2 } }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'ok' }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const page = await api.notifications.list({ unread: true })
    await api.notifications.read('abc-1')

    expect(page.meta.unread_count).toBe(2)
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/notifications?unread=1')
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/notifications/abc-1/read')
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('POST')
  })

  it('gère les projets et leurs notes', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { server_time: 'T' } }))
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: 4, body: 'Code portail' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.projects.list({ active: true, include: 'notes,links' })
    const note = await api.notes.create('projects', 9, { body: 'Code portail' })

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/projects?active=1&include=notes%2Clinks')
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/projects/9/notes')
    expect(note.id).toBe(4)
  })

  it('télécharge un document privé avec le jeton', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('PDF', { status: 200, headers: { 'Content-Type': 'application/pdf' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const blob = await api.documents.download({ download_path: 'documents/5/download' })

    expect(await blob.text()).toBe('PDF')
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/api/v1/documents/5/download')
    expect(init.headers.Authorization).toBe('Bearer t')
  })

  it('signale un document refusé avec le message de l\'API', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(403, { message: "Vous n'avez pas le droit de faire cette action." }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await expect(api.documents.download({ download_path: 'documents/5/download' })).rejects.toMatchObject({
      status: 403,
      message: "Vous n'avez pas le droit de faire cette action.",
    })
  })

  it('transforme une demande en projet', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { data: { request: { id: 1 }, project: { id: 2 } } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const result = await api.clientRequests.convert(1, { type: 'project', client_id: 3 })

    expect(result.project?.id).toBe(2)
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/client-requests/1/convert')
  })

  it('lit l\'entreprise, la banque et les paramètres', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: { name: 'Yonkou SARL' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 1, bank_name: 'CBAO', is_default: true }] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { currency: 'XOF', vat_rate: 18 } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { next: 'DEV-2026-0001' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    expect((await api.company.get()).name).toBe('Yonkou SARL')
    expect((await api.bankAccounts.list())[0]?.bank_name).toBe('CBAO')
    expect((await api.settings.get()).vat_rate).toBe(18)
    expect(await api.settings.numberingPreview('quote', 'DEV-{YYYY}-{####}')).toBe('DEV-2026-0001')
    expect(fetch.mock.calls[3]?.[0]).toBe(
      'https://api.test/api/v1/settings/numbering-preview?type=quote&format=DEV-%7BYYYY%7D-%7B%23%23%23%23%7D',
    )
  })

  it('modifie les lignes d\'un devis et télécharge son PDF', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 3, total: 472000 } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 3, status: { value: 'sent' } } }))
      .mockResolvedValueOnce(new Response('%PDF-1.7', { status: 200 }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const quote = await api.quotes.addLine(8, { designation: 'Caméra', quantity: 4, unit_cost: 50000, coefficient: 1.5 })
    await api.quotes.setStatus(3, 'sent')
    const pdf = await api.quotes.pdf(3)

    expect(quote.total).toBe(472000)
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/quote-sections/8/lines')
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body)).toEqual({ status: 'sent' })
    expect(fetch.mock.calls[2]?.[0]).toBe('https://api.test/api/v1/quotes/3/pdf')
    expect(await pdf.text()).toBe('%PDF-1.7')
  })

  it('ajoute une dépense avec justificatif en multipart', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: 3, expenses_total: 95000 } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.quotes.addExpense(3, { label: 'Achat caméras', amount: 95000, is_paid: true }, new Blob(['pdf']), 'facture.pdf')

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/api/v1/quotes/3/expenses')
    const form = init.body as FormData
    expect(form.get('label')).toBe('Achat caméras')
    expect(form.get('amount')).toBe('95000')
    expect(form.get('is_paid')).toBe('1')
    expect(form.get('file')).toBeInstanceOf(Blob)
  })

  it('envoie le devis par e-mail et insère un modèle', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: 3 } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.quotes.send(3, { to: ['client@example.sn'], subject: 'Devis', message: 'Bonjour', attach_proposal: true })
    await api.quotes.insertTemplate(3, 12)

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/quotes/3/send')
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body).attach_proposal).toBe(true)
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body)).toEqual({ template_id: 12 })
  })
})
