'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/StatCard';

interface Product {
  id: string;
  name: string;
  size: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  version: number;
  standardYieldQty: string;
  isActive: boolean;
  ingredients: { id: string; quantity: string; unit: string; rawMaterial: RawMaterial }[];
}

export default function BomPage() {
  const { data: products } = useSWR<Product[]>('/products', api.get);
  const { data: rawMaterials } = useSWR<RawMaterial[]>('/raw-materials', api.get);
  const [productId, setProductId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [standardYieldQty, setStandardYieldQty] = useState('1');
  const [ingredients, setIngredients] = useState([{ rawMaterialId: '', quantity: '', unit: 'g' }]);

  const recipesKey = productId ? `/recipes?productId=${productId}` : null;
  const { data: recipes } = useSWR<Recipe[]>(recipesKey, api.get);

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { rawMaterialId: '', quantity: '', unit: 'g' }]);
  }

  function updateIngredient(idx: number, field: string, value: string) {
    setIngredients((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/recipes', {
        productId,
        name,
        standardYieldQty: Number(standardYieldQty),
        ingredients: ingredients.map((i) => ({
          rawMaterialId: i.rawMaterialId,
          quantity: Number(i.quantity),
          unit: i.unit,
        })),
      });
      setShowForm(false);
      setName('');
      setIngredients([{ rawMaterialId: '', quantity: '', unit: 'g' }]);
      mutate(recipesKey);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save recipe');
    }
  }

  return (
    <div>
      <PageHeader title="Recipe Management (BOM)" description="Bill of materials per finished good, with standard yield tracking." />

      <div className="card mb-6">
        <label className="label">Product</label>
        <select className="input max-w-sm" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product…</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.size})
            </option>
          ))}
        </select>
      </div>

      {productId && (
        <>
          <div className="mb-4 flex justify-end">
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancel' : '+ New Recipe Version'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={onSubmit} className="card mb-6 space-y-4">
              <div>
                <label className="label">Recipe Name</label>
                <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Standard Yield Qty (bottles)</label>
                <input required type="number" className="input max-w-xs" value={standardYieldQty} onChange={(e) => setStandardYieldQty(e.target.value)} />
              </div>
              <div>
                <label className="label">Ingredients</label>
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <select
                      required
                      className="input"
                      value={ing.rawMaterialId}
                      onChange={(e) => updateIngredient(idx, 'rawMaterialId', e.target.value)}
                    >
                      <option value="">Raw material…</option>
                      {rawMaterials?.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      placeholder="Qty"
                      className="input w-28"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                    />
                    <input
                      required
                      placeholder="Unit"
                      className="input w-20"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    />
                  </div>
                ))}
                <button type="button" className="btn-secondary text-xs" onClick={addIngredientRow}>
                  + Add Ingredient
                </button>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button type="submit" className="btn-primary">
                Save Recipe
              </button>
            </form>
          )}

          <div className="space-y-4">
            {recipes?.map((r) => (
              <div key={r.id} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">
                    {r.name} <span className="text-xs text-gray-400">v{r.version}</span>
                  </h3>
                  <span className={`badge ${r.isActive ? 'bg-bluma-100 text-bluma-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mb-2 text-xs text-gray-500">Standard yield: {r.standardYieldQty} bottle(s)</p>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ingredients.map((i) => (
                      <tr key={i.id}>
                        <td>{i.rawMaterial.name}</td>
                        <td>
                          {i.quantity} {i.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {recipes?.length === 0 && <p className="text-sm text-gray-400">No recipes yet for this product.</p>}
          </div>
        </>
      )}
    </div>
  );
}
