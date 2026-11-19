import { describe, expect, it } from 'vitest'
import { parseBadgeList } from '../src'

describe('import des badges', () => {
  it('lit une liste collée depuis un tableur', () => {
    const { badges, unknownColumns } = parseBadgeList('Prénom;Nom;Fonction;Matricule;Validité;Remarque\nAwa;Ndiaye;Directrice;M-001;31/12/2027;x\n"Moussa";"Diop; fils";;M-002;;\n;;;;;')
    expect(badges).toEqual([
      { firstname: 'Awa', lastname: 'Ndiaye', job_title: 'Directrice', employee_number: 'M-001', valid_until: '2027-12-31' },
      { firstname: 'Moussa', lastname: 'Diop; fils', employee_number: 'M-002' },
    ])
    expect(unknownColumns).toEqual(['remarque'])
  })

  it('accepte les tabulations et les en-têtes en anglais', () => {
    expect(parseBadgeList('firstname\tlastname\nFatou\tSall').badges).toEqual([{ firstname: 'Fatou', lastname: 'Sall' }])
  })
})
