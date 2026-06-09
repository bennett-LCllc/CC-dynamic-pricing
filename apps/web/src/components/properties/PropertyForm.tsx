'use client';

import { useState, useEffect } from 'react';
import { createProperty, updateProperty } from '@/lib/api';
import type { Property, CreatePropertyInput, UpdatePropertyInput, PropertyType, PropertyStatus, PhotoCategory } from '@cc-ops/shared';
import { X, ImagePlus, GripVertical, Trash2 } from 'lucide-react';

interface PropertyFormProps {
  property?: Property | null;
  onClose: () => void;
  onSaved: () => void;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'HOUSE', label: 'House' },
  { value: 'CONDO', label: 'Condo' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
  { value: 'DUPLEX', label: 'Duplex' },
  { value: 'TRIPLEX', label: 'Triplex' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'CABIN', label: 'Cabin' },
];

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_RENOVATION', label: 'Under Renovation' },
  { value: 'SOLD', label: 'Sold' },
];

const COMMON_AMENITIES = [
  'WiFi', 'Pool', 'Hot Tub', 'Beach Access', 'BBQ Grill',
  'Washer/Dryer', 'Smart TV', 'Kitchen', 'Free Parking',
  'Air Conditioning', 'Heating', 'Fireplace', 'Balcony',
  'Ocean View', 'Pet Friendly',
];

const inputClass = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none';
const labelClass = 'block text-sm font-medium text-foreground mb-1';
const sectionClass = 'border-t border-border pt-4 mt-4';

export default function PropertyForm({ property, onClose, onSaved }: PropertyFormProps) {
  const isEditing = !!property;

  const [form, setForm] = useState<CreatePropertyInput>({
    name: '',
    address: '',
    zipCode: '',
    type: 'HOUSE',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    squareFeet: undefined,
    yearBuilt: undefined,
    description: '',
    amenities: [],
    baseRate: 100,
    cleaningFee: 0,
    petFee: 0,
    isPetFriendly: false,
    hasPool: false,
    hasHotTub: false,
    isBeachfront: false,
    status: 'ACTIVE',
    listingUrlAirbnb: '',
    listingUrlVrbo: '',
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<Array<{ url: string; caption: string; category: PhotoCategory }>>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('EXTERIOR');

  const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
    { value: 'EXTERIOR', label: 'Exterior' },
    { value: 'INTERIOR', label: 'Interior' },
    { value: 'KITCHEN', label: 'Kitchen' },
    { value: 'BATHROOM', label: 'Bathroom' },
    { value: 'BEDROOM', label: 'Bedroom' },
    { value: 'LIVING_ROOM', label: 'Living Room' },
    { value: 'POOL', label: 'Pool' },
    { value: 'YARD', label: 'Yard' },
    { value: 'DAMAGE', label: 'Damage' },
    { value: 'BEFORE_AFTER', label: 'Before/After' },
    { value: 'OTHER', label: 'Other' },
  ];

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name,
        address: property.address,
        zipCode: property.zipCode,
        type: property.type as PropertyType,
        bedrooms: property.bedrooms,
        bathrooms: Number(property.bathrooms),
        maxGuests: property.maxGuests,
        squareFeet: property.squareFeet ?? undefined,
        yearBuilt: property.yearBuilt ?? undefined,
        description: property.description ?? '',
        amenities: property.amenities ?? [],
        baseRate: Number(property.baseRate),
        cleaningFee: Number(property.cleaningFee),
        petFee: Number(property.petFee),
        isPetFriendly: property.isPetFriendly,
        hasPool: property.hasPool,
        hasHotTub: property.hasHotTub,
        isBeachfront: property.isBeachfront,
        status: property.status as PropertyStatus,
        listingUrlAirbnb: property.listingUrlAirbnb ?? '',
        listingUrlVrbo: property.listingUrlVrbo ?? '',
      });
      // Load existing photos
      if (property.photos) {
        setPhotos(
          property.photos.map((p) => ({
            url: p.url,
            caption: p.caption ?? '',
            category: p.category,
          }))
        );
      }
    }
  }, [property]);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => {
      const current = prev.amenities ?? [];
      const next = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: next };
    });
  };

  const addCustomAmenity = () => {
    const val = amenityInput.trim();
    if (val && !form.amenities?.includes(val)) {
      setForm((prev) => ({ ...prev, amenities: [...(prev.amenities ?? []), val] }));
      setAmenityInput('');
    }
  };

  const addPhoto = () => {
    const url = photoUrl.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, { url, caption: photoCaption.trim(), category: photoCategory }]);
    setPhotoUrl('');
    setPhotoCaption('');
    setPhotoCategory('EXTERIOR');
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        photos: photos.map((p, i) => ({
          url: p.url,
          caption: p.caption || undefined,
          category: p.category,
          sortOrder: i,
        })),
      };
      if (isEditing && property) {
        await updateProperty(property.id, payload as UpdatePropertyInput);
      } else {
        await createProperty(payload as CreatePropertyInput);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Property' : 'Add Property'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Basic Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Property Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Ocean Breeze Villa"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="e.g. 1234 Ocean Drive"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>ZIP Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.zipCode}
                    onChange={(e) => update('zipCode', e.target.value)}
                    placeholder="78418"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    className={inputClass}
                    value={form.type}
                    onChange={(e) => update('type', e.target.value)}
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => update('status', e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Describe the property..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ── Details ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Bedrooms <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  className={inputClass}
                  value={form.bedrooms}
                  onChange={(e) => update('bedrooms', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Bathrooms <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  className={inputClass}
                  value={form.bathrooms}
                  onChange={(e) => update('bathrooms', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Max Guests <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className={inputClass}
                  value={form.maxGuests}
                  onChange={(e) => update('maxGuests', parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Square Feet</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.squareFeet ?? ''}
                  onChange={(e) => update('squareFeet', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 1450"
                />
              </div>
              <div>
                <label className={labelClass}>Year Built</label>
                <input
                  type="number"
                  min={1800}
                  max={2100}
                  className={inputClass}
                  value={form.yearBuilt ?? ''}
                  onChange={(e) => update('yearBuilt', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 2005"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { key: 'isPetFriendly', label: 'Pet Friendly' },
                { key: 'hasPool', label: 'Pool' },
                { key: 'hasHotTub', label: 'Hot Tub' },
                { key: 'isBeachfront', label: 'Beachfront' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form as any)[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-ocean-500 focus:ring-ocean-500"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Pricing ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Pricing</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Base Rate ($) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.baseRate}
                  onChange={(e) => update('baseRate', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Cleaning Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.cleaningFee ?? 0}
                  onChange={(e) => update('cleaningFee', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Pet Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.petFee ?? 0}
                  onChange={(e) => update('petFee', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* ── Amenities ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_AMENITIES.map((amenity) => {
                const active = form.amenities?.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'bg-ocean-500 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-ocean-100 hover:text-ocean-700'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className={`${inputClass} flex-1`}
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                placeholder="Add custom amenity..."
              />
              <button
                type="button"
                onClick={addCustomAmenity}
                className="px-3 py-2 text-sm bg-muted hover:bg-ocean-100 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {(form.amenities ?? []).filter((a) => !COMMON_AMENITIES.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.amenities?.filter((a) => !COMMON_AMENITIES.includes(a)).map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-700 rounded-full text-xs"
                  >
                    {amenity}
                    <button type="button" onClick={() => toggleAmenity(amenity)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Listing URLs ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Listing URLs</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Airbnb URL</label>
                <input
                  type="url"
                  className={inputClass}
                  value={form.listingUrlAirbnb ?? ''}
                  onChange={(e) => update('listingUrlAirbnb', e.target.value)}
                  placeholder="https://airbnb.com/h/..."
                />
              </div>
              <div>
                <label className={labelClass}>VRBO URL</label>
                <input
                  type="url"
                  className={inputClass}
                  value={form.listingUrlVrbo ?? ''}
                  onChange={(e) => update('listingUrlVrbo', e.target.value)}
                  placeholder="https://vrbo.com/..."
                />
              </div>
            </div>
          </div>

          {/* ── Photos ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Photos</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Add photo URLs now. Upload to S3/storage will be available in phase 2.
            </p>

            {/* Add photo inputs */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div>
                <label className={labelClass}>Photo URL</label>
                <input
                  type="url"
                  className={inputClass}
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Caption</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="e.g. Living room view"
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={photoCategory}
                    onChange={(e) => setPhotoCategory(e.target.value as PhotoCategory)}
                  >
                    {PHOTO_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={addPhoto}
                disabled={!photoUrl.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" />
                Add Photo
              </button>
            </div>

            {/* Photo list */}
            {photos.length > 0 && (
              <div className="mt-4 space-y-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    {photo.url.startsWith('http') && (
                      <div className="w-12 h-12 rounded-lg bg-ocean-50 overflow-hidden shrink-0">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{photo.url}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {photo.caption && <span>{photo.caption}</span>}
                        <span className="badge badge-info">{photo.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 1)}
                        disabled={index === photos.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="p-1 text-muted-foreground hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground text-right">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} — drag to reorder
                </div>
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

