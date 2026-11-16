import { use } from 'react'
import { useParams } from 'react-router'
import { formatDate, formatDateTime, load, type Meta } from '../data'
import { ExternalLink, OfficialLink, UpdatedAt } from '../layout'
import { SalaryFormula } from '../pieces'

const repo = 'https://github.com/andersonschott/radar-cidades'

export default function Methodology() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  return (
    <article className="flex max-w-[68ch] flex-col gap-4 [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-black text-base [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-4xl font-black tracking-tight">Como funciona</h1>

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

      <h2>Presença</h2>
      <p>
        Vem da chamada registrada em cada sessão ({meta.sessions} sessões com chamada até agora). Quem aparece presente em qualquer chamada da sessão conta como presente.
        Sessões solenes e audiências sem chamada ficam de fora. Cada vereador é contado só nas sessões em que foi chamado.
        O site da Câmara não informa se a ausência foi justificada; por isso falamos em "ausências registradas", não em faltas.
      </p>

      <h2>Salário</h2>
      <p>
        O contador é uma <strong>estimativa</strong>: <SalaryFormula meta={meta} /> por mês, desde {meta.salaryFrom ? formatDate(meta.salaryFrom) : 'a vigência'}, conforme a {meta.salarySourceLabel ?? 'resolução'} da Câmara.
        É o valor bruto, sem descontos.{' '}
        {meta.thirteenthSalary
          ? 'Inclui o 13º, somado como um 13º pagamento por ano.'
          : 'Não inclui 13º: a resolução não o prevê e não encontramos registro oficial de pagamento.'}{' '}
        Não inclui reajustes posteriores.{' '}
        <OfficialLink href={meta.salarySourceUrl} label="Ler a resolução" />
      </p>

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
        <ExternalLink href={`${repo}/issues`}>Reportar um erro no GitHub</ExternalLink>
      </p>
      <p>Código aberto (AGPL-3.0). Dados sob CC BY 4.0. <ExternalLink href={repo}>Ver o código no GitHub</ExternalLink></p>
      <UpdatedAt meta={meta} />
    </article>
  )
}
