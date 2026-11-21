import { useI18n } from "../i18n";

export const POLICY_PATH = "/coookie-policy";

/** Coookie ポリシー。中身はすべてジョーク。 */
export function PolicyView() {
  const { t } = useI18n();
  const p = t.policy;

  return (
    <article className="page policy">
      <p className="policy__eyebrow">{p.revised}</p>
      <h1 className="page__title">{p.title}</h1>
      <p className="page__lead">{p.lead}</p>

      {p.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
          {section.list && (
            <ul>
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p>
        <a className="btn btn--primary" href="/">
          {p.back}
        </a>
      </p>
    </article>
  );
}
