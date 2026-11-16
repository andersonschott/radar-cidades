import { use } from 'react'
import { useParams } from 'react-router'
import { formatDateTime, load, type Meta } from '../data'
import { OfficialLink } from '../layout'

const repo = 'https://github.com/andersonschott/radar-cidades'

export default function Methodology() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  return (
    <article className="prose-sm flex max-w-2xl flex-col gap-4 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-2xl font-semibold tracking-tight">Metodologia</h1>

      <h2>Fonte</h2>
      <p>
        Todos os dados vêm do sistema legislativo oficial da Câmara Municipal de {meta.name}.{' '}
        <OfficialLink href={meta.officialUrl} label="Acessar a fonte" />
      </p>
      <p>
        A coleta é automática, uma vez por dia, com no máximo uma requisição por segundo. Última coleta concluída:{' '}
        <strong>{meta.lastSuccessfulScrape ? formatDateTime(meta.lastSuccessfulScrape) : 'nenhuma ainda'}</strong>.
      </p>

      <h2>O que contamos</h2>
      <ul>
        <li>Proposições apresentadas desde 1º de janeiro de 2025, início da legislatura: indicações, requerimentos, moções e projetos.</li>
        <li><strong>Pedido para bairro:</strong> toda indicação, e todo requerimento que cita um endereço.</li>
        <li>Uma proposição com vários autores conta para cada um deles.</li>
      </ul>

      <h2>Limitações</h2>
      <ul>
        <li>Rua e bairro são extraídos do texto por regras automáticas e podem sair incompletos ou errados.</li>
        <li>Suplentes e ex-vereadores que assinaram proposições nesta legislatura ainda não são exibidos. As proposições deles aparecem na busca por bairro sem o nome do autor.</li>
        <li>Partido é o informado hoje pela Câmara. Trocas de partido durante o mandato não aparecem.</li>
        <li>Volume de proposições não mede qualidade nem resultado. Um pedido registrado não significa que foi atendido.</li>
      </ul>

      <h2>Correções</h2>
      <p>
        Encontrou um erro? Abra uma issue no repositório público do projeto. Correções na fonte oficial aparecem na coleta seguinte.{' '}
        <OfficialLink href={`${repo}/issues`} label="Reportar um erro" />
      </p>
      <p>Código aberto (AGPL-3.0). Dados sob CC BY 4.0. <OfficialLink href={repo} label="Repositório" /></p>
    </article>
  )
}
