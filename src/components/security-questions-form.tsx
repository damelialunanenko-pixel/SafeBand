import { SECURITY_QUESTIONS, type SecurityAnswers, type SecurityQuestionId } from '@/config/security-questions';
import { useLocalization } from '@/localization';
import { validateChoice } from '@/services/validation';
import { SelectField, useTouched } from './form';

/** The four security-question pickers; used for setup and for the new-device check. */
export function SecurityQuestionsForm({ value, onChange }: { value: SecurityAnswers; onChange: (v: SecurityAnswers) => void }) {
  const { language } = useLocalization();
  const { touch, shown } = useTouched<SecurityQuestionId>();
  return (
    <>
      {SECURITY_QUESTIONS.map((q, i) => (
        <SelectField
          key={q.id}
          label={`${i + 1}. ${q.label[language]}`}
          value={value[q.id]}
          options={q.options}
          searchable={q.options.length > 12 && q.id !== 'friendInitial'}
          onChange={(id) => onChange({ ...value, [q.id]: id })}
          onTouched={() => touch(q.id)}
          error={shown(q.id, validateChoice(value[q.id]))}
        />
      ))}
    </>
  );
}
