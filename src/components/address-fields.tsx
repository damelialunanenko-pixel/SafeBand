import { ADDRESS_CITY_OPTIONS } from '@/config/profile-options';
import { useLocalization } from '@/localization';
import type { AddressForm, FieldErrors } from '@/services/validation';
import { Field, SelectField } from './form';

type Props = {
  value: AddressForm;
  onChange: <K extends keyof AddressForm>(key: K, v: AddressForm[K]) => void;
  errors: FieldErrors<keyof AddressForm>;
  touch: (key: keyof AddressForm) => void;
  shown: (key: keyof AddressForm, error: string | null | undefined) => string | null;
};

/** City (list + "Other"), street, building, apartment. */
export function AddressFields({ value, onChange, errors, touch, shown }: Props) {
  const { t } = useLocalization();
  return (
    <>
      <SelectField label={t('city')} value={value.cityId} options={ADDRESS_CITY_OPTIONS} searchable
        onChange={(id) => onChange('cityId', id)} onTouched={() => touch('cityId')} error={shown('cityId', errors.cityId)} />
      {value.cityId === 'other' ? (
        <Field label={t('cityOther')} value={value.cityOther} onChangeText={(v) => onChange('cityOther', v)} onTouched={() => touch('cityOther')}
          error={shown('cityOther', errors.cityOther)} placeholder={t('cityOtherPlaceholder')} autoCapitalize="words" />
      ) : null}
      <Field label={t('street')} value={value.street} onChangeText={(v) => onChange('street', v)} onTouched={() => touch('street')}
        error={shown('street', errors.street)} placeholder={t('streetPlaceholder')} autoComplete="street-address" />
      <Field label={t('house')} value={value.house} onChangeText={(v) => onChange('house', v)} onTouched={() => touch('house')}
        error={shown('house', errors.house)} placeholder={t('housePlaceholder')} />
      <Field label={t('apartment')} value={value.apartment} onChangeText={(v) => onChange('apartment', v)} onTouched={() => touch('apartment')}
        error={shown('apartment', errors.apartment)} placeholder={t('apartmentPlaceholder')} />
    </>
  );
}
