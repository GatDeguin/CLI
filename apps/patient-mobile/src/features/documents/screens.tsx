import { Text } from 'react-native';
import { ScreenId, byId } from '../../config/screens';
import { useSession } from '../../session/SessionProvider';
import { Card, FeatureScreen, NextStep, StateBlock } from '../shared/ui';
import { documentsErrorToMessage } from './errors';
import { useDocumentById, useDocuments, useResults } from './hooks';

export function DocumentsScreen({ screenId }: { screenId: ScreenId }) {
  const meta = byId(screenId);
  const profileId = useSession().activeProfileId ?? 'self';
  const results = useResults(profileId, screenId === 'SC-19' || screenId === 'SC-20');
  const documents = useDocuments(profileId, screenId === 'SC-21' || screenId === 'SC-22');
  const selectedId = documents.data?.[0]?.id ?? '';
  const detail = useDocumentById(selectedId, screenId === 'SC-20' || screenId === 'SC-22');

  return (
    <FeatureScreen title={`${meta.id} · ${meta.title}`} subtitle={meta.description}>
      {screenId === 'SC-19' && (
        <Card title="Resultados clínicos">
          <StateBlock
            isLoading={results.isLoading}
            error={results.error ? documentsErrorToMessage(results.error) : null}
            isEmpty={!results.data?.length}
            emptyText="Aún no hay resultados para este perfil."
            success={results.data?.map((result) => <Text key={result.id}>• {result.title}</Text>)}
          />
          <NextStep to="/sc/sc-20" label="Ver detalle del resultado" />
        </Card>
      )}

      {screenId === 'SC-20' && (
        <Card title="Detalle de resultado">
          <StateBlock
            isLoading={detail.isLoading}
            error={detail.error ? documentsErrorToMessage(detail.error) : null}
            success={detail.data ? <Text>{detail.data.title} · Fecha: {detail.data.createdAt}</Text> : <Text>Seleccioná un resultado desde la pantalla anterior.</Text>}
          />
        </Card>
      )}

      {screenId === 'SC-21' && (
        <Card title="Documentos y certificados">
          <StateBlock
            isLoading={documents.isLoading}
            error={documents.error ? documentsErrorToMessage(documents.error) : null}
            isEmpty={!documents.data?.length}
            emptyText="No hay documentos disponibles para descargar."
            success={documents.data?.map((document) => <Text key={document.id}>• {document.title}</Text>)}
          />
          <NextStep to="/sc/sc-22" label="Compartir un documento" />
        </Card>
      )}

      {screenId === 'SC-22' && (
        <Card title="Compartir documento">
          <StateBlock
            isLoading={detail.isLoading}
            error={detail.error ? documentsErrorToMessage(detail.error) : null}
            success={detail.data ? <Text>Enlace de descarga: {detail.data.downloadUrl ?? 'No disponible'}</Text> : <Text>Elegí un documento para compartir.</Text>}
          />
        </Card>
      )}
    </FeatureScreen>
  );
}
